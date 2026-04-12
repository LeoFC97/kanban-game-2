import { createRng, rollIntInclusive, type Rng } from './rng';
import { clamp, pairKey, resolveSynergy } from './synergy';
import { resolveMemberModifiers } from './memberModifiers';
import {
  aggregateGlobalCapacityBonusBySpecialty,
  aggregateGlobalHandoffReworkChanceReduction,
} from './roleModifiers';
import { rollDailyRandomEvents } from './dailyRandomEvents';
import type {
  BoardCard,
  BoardState,
  Card,
  CeremonyKind,
  ColumnId,
  CompletedCardTiming,
  DailyRandomEventLog,
  DayLog,
  MemberDayCapacityBreakdown,
  GameConfig,
  LogNote,
  Member,
  SimulationParams,
  SimulationResult,
  Specialty,
  SynergyRuntime,
  TaskKind,
} from './types';
import { COLUMN_ORDER, specialtyForColumn } from './types';
import { mergeSpecialtyByTaskKind } from './taskKinds';

function addNote(
  notes: LogNote[],
  key: string,
  params?: Record<string, string | number>,
): void {
  notes.push(params ? { key, params } : { key });
}

export function splitWork(p: number): { wa: number; wd: number; wt: number } {
  if (p <= 0) return { wa: 0, wd: 0, wt: 0 };
  const wa = Math.max(1, Math.round(0.3 * p));
  let wd = Math.max(1, Math.round(0.5 * p));
  let wt = p - wa - wd;
  if (wt < 1) {
    wt = 1;
    wd = Math.max(1, p - wa - wt);
  }
  if (wa + wd + wt > p) {
    const excess = wa + wd + wt - p;
    wd = Math.max(1, wd - excess);
    wt = p - wa - wd;
  }
  return { wa, wd, wt: p - wa - wd };
}

export function cardToBoardCard(c: Card): BoardCard {
  const hasCustom =
    c.workAnalise !== undefined && c.workDev !== undefined && c.workTeste !== undefined;
  let wa: number;
  let wd: number;
  let wt: number;
  let pointsOut: number;
  if (hasCustom) {
    wa = Math.max(0, Math.round(Number(c.workAnalise) || 0));
    wd = Math.max(0, Math.round(Number(c.workDev) || 0));
    wt = Math.max(0, Math.round(Number(c.workTeste) || 0));
    const sum = wa + wd + wt;
    if (sum < 1) {
      const s = splitWork(Math.max(1, c.points));
      wa = s.wa;
      wd = s.wd;
      wt = s.wt;
      pointsOut = Math.max(1, c.points);
    } else {
      pointsOut = sum;
    }
  } else {
    const s = splitWork(Math.max(1, c.points));
    wa = s.wa;
    wd = s.wd;
    wt = s.wt;
    pointsOut = Math.max(1, c.points);
  }
  return {
    ...c,
    points: pointsOut,
    taskKind: c.taskKind ?? 'backend',
    workAnalise: wa,
    workDev: wd,
    workTeste: wt,
    remainingInStage: 0,
  };
}

export function initialBoard(config: GameConfig): BoardState {
  const cardsById: Record<string, BoardCard> = {};
  const backlogIds: string[] = [];
  for (const c of config.backlogCards) {
    const bc = cardToBoardCard(c);
    cardsById[bc.id] = bc;
    backlogIds.push(bc.id);
  }
  return {
    columns: {
      backlog: backlogIds,
      analise: [],
      dev: [],
      teste: [],
      deploy: [],
    },
    cardsById,
  };
}

function colIndex(col: ColumnId): number {
  return COLUMN_ORDER.indexOf(col);
}

function nextColumn(col: ColumnId): ColumnId | null {
  const i = colIndex(col);
  if (i < 0 || i >= COLUMN_ORDER.length - 1) return null;
  return COLUMN_ORDER[i + 1];
}

function removeId(arr: string[], id: string): void {
  const ix = arr.indexOf(id);
  if (ix >= 0) arr.splice(ix, 1);
}

function pushCard(board: BoardState, col: ColumnId, id: string): void {
  board.columns[col].push(id);
}

function moveCard(board: BoardState, id: string, from: ColumnId, to: ColumnId): void {
  removeId(board.columns[from], id);
  pushCard(board, to, id);
}

function memberBySpecialty(
  members: Member[],
  sp: Specialty,
): Member | undefined {
  return members.find((m) => m.specialty === sp);
}

function ownerForStage(
  card: BoardCard,
  members: Member[],
  stage: Specialty,
  specialtyByTaskKind: Record<TaskKind, Specialty>,
): Member {
  const taskKind: TaskKind = card.taskKind ?? 'backend';
  const expertSpec = specialtyByTaskKind[taskKind] ?? stage;
  const assignees = card.assigneeIds
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is Member => !!m);
  const forStage = assignees.filter((m) => m.specialty === stage);
  if (forStage.length > 0) {
    const expertMatch = forStage.find((m) => m.specialty === expertSpec && expertSpec === stage);
    if (expertMatch) return expertMatch;
    return forStage[0]!;
  }
  const fallback = memberBySpecialty(members, stage);
  if (fallback) return fallback;
  return members[0];
}

/** Máximo do sorteio legado 1…N quando `deliveryMax` não está definido no membro. */
export function diceMaxForMember(m: Member): number {
  const mod = resolveMemberModifiers(m);
  return clamp(6 + mod.diceMaxDelta, 2, 8);
}

/** Teto de capacidade efetiva num dia, após multiplicadores (permite intervalos de setup mais altos que o dado clássico). */
const EFFECTIVE_DAILY_CAPACITY_MAX = 48;

function normalizedDeliveryRange(m: Member): { lo: number; hi: number } {
  const dmax = diceMaxForMember(m);
  const minRaw = m.deliveryMin ?? 1;
  const maxRaw = m.deliveryMax ?? dmax;
  let lo = Math.round(minRaw);
  let hi = Math.round(maxRaw);
  lo = clamp(lo, 1, 30);
  hi = clamp(hi, 1, 30);
  if (lo > hi) [lo, hi] = [hi, lo];
  return { lo, hi };
}

/** Sorteio uniforme no intervalo de entrega (RNG inicial do dia, antes de multiplicadores). */
function rollBaseDailyDelivery(m: Member, rng: Rng): number {
  const { lo, hi } = normalizedDeliveryRange(m);
  return rollIntInclusive(rng, lo, hi);
}

function specialistMultiplier(m: Member): number {
  const mod = resolveMemberModifiers(m);
  return clamp(2 + mod.specialistBonusDelta, 1.25, 3.5);
}

function collabTraitBonus(members: Member[], ids: string[]): number {
  let s = 0;
  for (const id of ids) {
    const mem = members.find((x) => x.id === id);
    if (mem) s += resolveMemberModifiers(mem).collabMultiplierDelta;
  }
  return s;
}

function handoffTraitBonus(a: Member, b: Member): number {
  return (
    resolveMemberModifiers(a).handoffMultiplierDelta +
    resolveMemberModifiers(b).handoffMultiplierDelta
  );
}

/** WIP máximo por coluna de fluxo (Análise / Dev / Teste), com ajuste pelos traços. */
export function wipEffective(params: SimulationParams, members: Member[]): number {
  let d = 0;
  for (const m of members) d += resolveMemberModifiers(m).maxWipDelta;
  return Math.max(1, params.wipPerColumn + Math.round(d));
}

function applyAdvance(
  board: BoardState,
  card: BoardCard,
  from: ColumnId,
  to: ColumnId,
  members: Member[],
  synergy: SynergyRuntime,
  p: SimulationParams,
  rng: Rng,
  notes: LogNote[],
  specialtyByTaskKind: Record<TaskKind, Specialty>,
): void {
  const spFrom = specialtyForColumn(from);
  const spTo = specialtyForColumn(to);
  let handoffMult = 1;
  let reworkExtra = 0;
  if (spFrom && spTo) {
    const outM = ownerForStage(card, members, spFrom, specialtyByTaskKind);
    const inM = ownerForStage(card, members, spTo, specialtyByTaskKind);
    const s = resolveSynergy(members, synergy.synergyByPair, outM.id, inM.id, {
      synergyPairBidirectional: synergy.synergyPairBidirectional,
      synergyDirected: synergy.synergyDirected,
      mode: 'handoff',
    });
    const traitB = handoffTraitBonus(outM, inM);
    handoffMult = clamp(
      1 + p.synergyGamma * s + traitB,
      p.handoffEffMin,
      p.handoffEffMax,
    );
    const thr = p.handoffReworkSynergyThreshold;
    let pRework = s < thr ? clamp(0.06 + (thr - s) * 0.22, 0, 0.42) : 0;
    pRework += resolveMemberModifiers(outM).reworkChanceDelta;
    pRework += resolveMemberModifiers(inM).reworkChanceDelta;
    pRework -= aggregateGlobalHandoffReworkChanceReduction(members);
    pRework = clamp(pRework, 0, 0.55);
    if (rng.next() < pRework) {
      reworkExtra = p.reworkUnits;
      addNote(notes, 'engine.reworkHandoff', {
        title: card.title,
        fromCol: from,
        toCol: to,
      });
    }
  }
  moveCard(board, card.id, from, to);
  if (to === 'deploy') {
    card.remainingInStage = 0;
    return;
  }
  if (to === 'analise') card.remainingInStage = card.workAnalise + reworkExtra;
  else if (to === 'dev') {
    const base = Math.max(0, Math.round(card.workDev / handoffMult));
    card.remainingInStage = base + reworkExtra;
  } else if (to === 'teste') {
    const base = Math.max(0, Math.round(card.workTeste / handoffMult));
    card.remainingInStage = base + reworkExtra;
  }
}

function tryFinishStage(
  board: BoardState,
  card: BoardCard,
  col: ColumnId,
  members: Member[],
  synergy: SynergyRuntime,
  p: SimulationParams,
  rng: Rng,
  notes: LogNote[],
  specialtyByTaskKind: Record<TaskKind, Specialty>,
): void {
  if (card.remainingInStage > 0) return;
  const nxt = nextColumn(col);
  if (!nxt) return;
  applyAdvance(board, card, col, nxt, members, synergy, p, rng, notes, specialtyByTaskKind);
  if (card.remainingInStage === 0 && nxt !== 'deploy') {
    tryFinishStage(board, card, nxt, members, synergy, p, rng, notes, specialtyByTaskKind);
  }
}

/**
 * Preenche Análise a partir do backlog respeitando WIP.
 * Com `planningPullMax === 0` não corre (só entradas manuais no quadro), alinhado ao antigo fluxo sem pull automático.
 */
function pullBacklogToAnalise(
  board: BoardState,
  wip: number,
  params: SimulationParams,
  notes: LogNote[],
  enteredReadyDay: Record<string, number>,
  globalDay: number,
): void {
  if (params.planningPullMax <= 0) return;
  while (board.columns.analise.length < wip && board.columns.backlog.length > 0) {
    const id = board.columns.backlog.shift()!;
    const card = board.cardsById[id];
    moveCard(board, id, 'backlog', 'analise');
    card.remainingInStage = card.workAnalise;
    if (enteredReadyDay[id] === undefined) enteredReadyDay[id] = globalDay;
    addNote(notes, 'engine.pullBacklogAnalise', { title: card.title });
  }
}

function planningStep(
  board: BoardState,
  params: SimulationParams,
  wip: number,
  notes: LogNote[],
  globalDay: number,
  enteredReadyDay: Record<string, number>,
): void {
  let n = 0;
  while (
    n < params.planningPullMax &&
    board.columns.backlog.length > 0 &&
    board.columns.analise.length < wip
  ) {
    const id = board.columns.backlog.shift()!;
    moveCard(board, id, 'backlog', 'analise');
    const card = board.cardsById[id];
    card.remainingInStage = card.workAnalise;
    enteredReadyDay[id] = globalDay;
    n++;
    addNote(notes, 'engine.planningToAnalise', { title: card.title });
  }
}

interface WorkCol {
  col: ColumnId;
  specialty: Specialty;
}

const WORK_COLS: WorkCol[] = [
  { col: 'analise', specialty: 'Analista' },
  { col: 'dev', specialty: 'Desenvolvedor' },
  { col: 'teste', specialty: 'Testador' },
];

function synergyCollabMultiplier(
  card: BoardCard,
  members: Member[],
  synergy: SynergyRuntime,
  p: SimulationParams,
): number {
  const ids = card.assigneeIds;
  if (ids.length < 2) return 1;
  let pairSum = 0;
  let pairCount = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      pairSum += resolveSynergy(members, synergy.synergyByPair, ids[i]!, ids[j]!, {
        synergyPairBidirectional: synergy.synergyPairBidirectional,
        synergyDirected: synergy.synergyDirected,
        mode: 'collaboration',
      });
      pairCount++;
    }
  }
  const s = pairCount === 0 ? 0 : pairSum / pairCount;
  const t = collabTraitBonus(members, ids);
  return clamp(1 + p.synergyBeta * s + t, p.collabEffMin, p.collabEffMax);
}

/** Spend raw capacity `rawPool` on column; on Dev, cards with 2+ assignees apply the collaboration multiplier (average pairwise synergy). Returns raw capacity consumed. */
function spendOnColumn(
  board: BoardState,
  col: ColumnId,
  rawPool: number,
  members: Member[],
  synergy: SynergyRuntime,
  p: SimulationParams,
  rng: Rng,
  notes: LogNote[],
  specialtyByTaskKind: Record<TaskKind, Specialty>,
): number {
  let rawLeft = rawPool;
  const ids = [...board.columns[col]];
  for (const id of ids) {
    if (rawLeft <= 0) break;
    const card = board.cardsById[id];
    if (card.remainingInStage <= 0) continue;
    const mult = col === 'dev' ? synergyCollabMultiplier(card, members, synergy, p) : 1;
    const maxRawForCard = card.remainingInStage / mult;
    const rawUse = Math.min(rawLeft, maxRawForCard);
    const eff = rawUse * mult;
    card.remainingInStage = Math.max(0, card.remainingInStage - eff);
    rawLeft -= rawUse;
    tryFinishStage(board, card, col, members, synergy, p, rng, notes, specialtyByTaskKind);
  }
  return rawPool - rawLeft;
}

function workDayStep(
  board: BoardState,
  members: Member[],
  synergy: SynergyRuntime,
  params: SimulationParams,
  rng: Rng,
  notes: LogNote[],
  diceByMemberId: Record<string, number>,
  effectiveCapacityByMemberId: Record<string, number>,
  capacityBreakdownByMemberId: Record<string, MemberDayCapacityBreakdown>,
  specialtyByTaskKind: Record<TaskKind, Specialty>,
  enteredReadyDay: Record<string, number>,
  globalDay: number,
  dayCapacityMultByMemberId?: Record<string, number>,
): void {
  const wip = wipEffective(params, members);
  pullBacklogToAnalise(board, wip, params, notes, enteredReadyDay, globalDay);

  const specialtyCol = (m: Member): ColumnId | null => {
    const w = WORK_COLS.find((x) => x.specialty === m.specialty);
    return w ? w.col : null;
  };

  const hasWork = (col: ColumnId): boolean =>
    board.columns[col].some((cid) => board.cardsById[cid].remainingInStage > 0);

  const globalCapBonusBySpecialty = aggregateGlobalCapacityBonusBySpecialty(members);

  for (const m of members) {
    const base = rollBaseDailyDelivery(m, rng);
    diceByMemberId[m.id] = base;
    const sc = specialtyCol(m);
    let afterSpec = base;
    if (sc && hasWork(sc)) {
      afterSpec = Math.min(
        EFFECTIVE_DAILY_CAPACITY_MAX,
        Math.round(base * specialistMultiplier(m)),
      );
    }
    let afterRole = afterSpec;
    const capBonus = globalCapBonusBySpecialty[m.specialty] ?? 0;
    if (capBonus > 0) {
      afterRole = Math.min(
        EFFECTIVE_DAILY_CAPACITY_MAX,
        Math.round(afterSpec * (1 + capBonus)),
      );
    }
    let rawCap = afterRole;
    const dayMult = dayCapacityMultByMemberId?.[m.id];
    if (dayMult !== undefined && dayMult !== 1) {
      rawCap = Math.max(
        0,
        Math.min(EFFECTIVE_DAILY_CAPACITY_MAX, Math.round(afterRole * dayMult)),
      );
    }
    capacityBreakdownByMemberId[m.id] = {
      afterSpecialist: afterSpec,
      afterRoleBonus: afterRole,
      afterDailyEvent: rawCap,
    };
    effectiveCapacityByMemberId[m.id] = rawCap;
    let left = rawCap;
    if (sc && hasWork(sc)) {
      left -= spendOnColumn(board, sc, left, members, synergy, params, rng, notes, specialtyByTaskKind);
    }
    for (const { col } of WORK_COLS) {
      if (left <= 0) break;
      left -= spendOnColumn(board, col, left, members, synergy, params, rng, notes, specialtyByTaskKind);
    }
  }
}

function countColumns(board: BoardState): Record<ColumnId, number> {
  const out = {} as Record<ColumnId, number>;
  for (const k of COLUMN_ORDER) out[k] = board.columns[k].length;
  return out;
}

function columnOfCard(board: BoardState, cardId: string): ColumnId | null {
  for (const c of COLUMN_ORDER) {
    if (board.columns[c].includes(cardId)) return c;
  }
  return null;
}

export type AssigneeRuleFailure = {
  ok: false;
  errorKey: string;
  errorParams?: Record<string, string | number>;
};

export type UpdateCardAssigneesResult = { ok: true } | AssigneeRuleFailure;

/** Valida e devolve IDs normalizados (membros válidos, sem duplicados, ordem preservada). */
export function resolveAssigneesForCard(
  card: BoardCard,
  members: Member[],
  assigneeIds: string[],
): { ok: true; ids: string[] } | AssigneeRuleFailure {
  const valid = new Set(members.map((m) => m.id));
  const filtered = assigneeIds.filter((id) => valid.has(id));
  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const id of filtered) {
    if (seen.has(id)) {
      return {
        ok: false,
        errorKey: 'errors.assigneesMustBeDistinct',
        errorParams: { title: card.title },
      };
    }
    seen.add(id);
    uniq.push(id);
  }
  if (uniq.length < 1) {
    return {
      ok: false,
      errorKey: 'errors.cardOneAssignee',
      errorParams: { title: card.title },
    };
  }
  return { ok: true, ids: uniq };
}

function ceremonyFor(dayInSprint: number, days: number): CeremonyKind {
  if (dayInSprint === 1) return 'sprint_planning';
  if (dayInSprint === days) return 'sprint_review';
  return 'daily_scrum';
}

export type ManualMoveResult =
  | { ok: true }
  | { ok: false; errorKey: string; errorParams?: Record<string, string | number> };

/** Arestas permitidas ao arrastar cartões manualmente (só avanço no fluxo). */
export function isManualCardMoveAllowed(from: ColumnId, to: ColumnId): boolean {
  const edges: Partial<Record<ColumnId, ColumnId[]>> = {
    backlog: ['analise'],
    analise: ['dev'],
    dev: ['teste'],
    teste: ['deploy'],
  };
  return edges[from]?.includes(to) ?? false;
}

const MANUAL_ADVANCE_FROM_COLS: ColumnId[] = ['analise', 'dev', 'teste'];

/** Em Análise / Dev / Testes, só avança manualmente para a coluna seguinte com `remainingInStage === 0`. */
export function canManuallyAdvanceCardFromColumn(card: BoardCard, fromCol: ColumnId): boolean {
  if (!MANUAL_ADVANCE_FROM_COLS.includes(fromCol)) return true;
  return card.remainingInStage <= 1e-9;
}

export type InteractiveRunner = {
  step: () => DayLog | null;
  /** Avança até processar uma Retrospectiva (fim lógico do sprint) ou até o jogo terminar. */
  advanceUntilAfterRetro: () => void;
  getBoard: () => BoardState;
  getLogs: () => DayLog[];
  getCompleted: () => CompletedCardTiming[];
  /**
   * Atualiza responsáveis de um cartão no quadro (exceto em Deploy).
   * Afeta sinergia em Dev e donos de handoff nas etapas seguintes.
   */
  updateCardAssignees: (cardId: string, assigneeIds: string[]) => UpdateCardAssigneesResult;
  /**
   * Move um cartão entre colunas (arrastar no quadro). Respeita WIP em Análise/Dev/Teste.
   * Atualiza `columnCounts` do último dia no log (para o CFD) quando já existe histórico.
   */
  manualMoveCard: (cardId: string, toColumn: ColumnId) => ManualMoveResult;
};

/** Avança um dia de calendário (rito + trabalho) ou uma retrospectiva; `null` quando terminou todos os sprints. */
export function createInteractiveRunner(config: GameConfig): InteractiveRunner {
  const rng = createRng(config.params.seed);
  const board = initialBoard(config);
  const logs: DayLog[] = [];
  const completed: CompletedCardTiming[] = [];
  const enteredReadyDay: Record<string, number> = {};
  const deployedIds = new Set<string>();
  let globalDay = 0;
  let sprint = 1;
  let dayInSprint = 1;
  let inRetro = false;
  const { params, members } = config;
  const synergy: SynergyRuntime = {
    synergyByPair: ensureSynergyKeys(config.members, config.synergyByPair),
    synergyPairBidirectional: config.synergyPairBidirectional,
    synergyDirected: config.synergyDirected,
  };
  const specialtyByTaskKind = mergeSpecialtyByTaskKind(config);

  function recordDeploys(): void {
    for (const id of board.columns.deploy) {
      if (!deployedIds.has(id)) {
        deployedIds.add(id);
        completed.push({
          cardId: id,
          enteredReadyGlobalDay: enteredReadyDay[id] ?? globalDay,
          deployedGlobalDay: globalDay,
          cycleTimeDays: globalDay - (enteredReadyDay[id] ?? globalDay),
        });
      }
    }
  }

  function stepImpl(): DayLog | null {
    if (sprint > params.numSprints) return null;
    globalDay++;
    if (!inRetro) {
      const ceremony = ceremonyFor(dayInSprint, params.daysPerSprint);
      const notes: LogNote[] = [];
      const diceByMemberId: Record<string, number> = {};
      const effectiveCapacityByMemberId: Record<string, number> = {};
      const capacityBreakdownByMemberId: Record<string, MemberDayCapacityBreakdown> = {};
      let dailyRandomEvents: DailyRandomEventLog[] | undefined;

      if (ceremony === 'sprint_planning') {
        const wip = wipEffective(params, members);
        planningStep(board, params, wip, notes, globalDay, enteredReadyDay);
        pullBacklogToAnalise(board, wip, params, notes, enteredReadyDay, globalDay);
      } else if (ceremony === 'daily_scrum' || ceremony === 'sprint_review') {
        if (ceremony === 'sprint_review') {
          addNote(notes, 'engine.sprintReviewDay');
        }
        const rolled = rollDailyRandomEvents(members, params, rng, notes);
        if (rolled.events.length > 0) dailyRandomEvents = rolled.events;
        workDayStep(
          board,
          members,
          synergy,
          params,
          rng,
          notes,
          diceByMemberId,
          effectiveCapacityByMemberId,
          capacityBreakdownByMemberId,
          specialtyByTaskKind,
          enteredReadyDay,
          globalDay,
          rolled.capacityMultByMemberId,
        );
      }

      recordDeploys();
      const log: DayLog = {
        globalDay,
        sprint,
        dayInSprint,
        ceremony,
        diceByMemberId,
        effectiveCapacityByMemberId,
        ...(ceremony === 'daily_scrum' || ceremony === 'sprint_review'
          ? { capacityBreakdownByMemberId }
          : {}),
        columnCounts: countColumns(board),
        notes,
        ...(dailyRandomEvents && dailyRandomEvents.length > 0 ? { dailyRandomEvents } : {}),
      };
      logs.push(log);
      if (dayInSprint < params.daysPerSprint) dayInSprint++;
      else inRetro = true;
      return log;
    }

    const retroLog: DayLog = {
      globalDay,
      sprint,
      dayInSprint: params.daysPerSprint + 1,
      ceremony: 'retrospective',
      diceByMemberId: {},
      effectiveCapacityByMemberId: {},
      columnCounts: countColumns(board),
      notes: [{ key: 'engine.retroNarrative' }],
    };
    logs.push(retroLog);
    inRetro = false;
    sprint++;
    dayInSprint = 1;
    return retroLog;
  }

  function updateCardAssignees(cardId: string, assigneeIds: string[]): UpdateCardAssigneesResult {
    const card = board.cardsById[cardId];
    if (!card) return { ok: false, errorKey: 'play.assigneeUnknownCard' };
    const col = columnOfCard(board, cardId);
    if (col === 'deploy') {
      return { ok: false, errorKey: 'play.assigneeReadOnlyDeploy', errorParams: { title: card.title } };
    }
    if (!col) return { ok: false, errorKey: 'play.assigneeUnknownCard' };
    const res = resolveAssigneesForCard(card, members, assigneeIds);
    if (!res.ok) return res;
    card.assigneeIds = res.ids;
    return { ok: true };
  }

  function manualMoveCard(cardId: string, toColumn: ColumnId): ManualMoveResult {
    const fromCol = columnOfCard(board, cardId);
    if (!fromCol) return { ok: false, errorKey: 'play.manualMoveUnknownCard' };
    if (fromCol === toColumn) return { ok: true };
    if (fromCol === 'deploy') {
      return { ok: false, errorKey: 'play.manualMoveFromDeploy' };
    }
    if (!isManualCardMoveAllowed(fromCol, toColumn)) {
      return { ok: false, errorKey: 'play.manualMoveNotAllowed' };
    }
    const card = board.cardsById[cardId];
    if (!card) return { ok: false, errorKey: 'play.manualMoveUnknownCard' };
    if (!canManuallyAdvanceCardFromColumn(card, fromCol)) {
      return { ok: false, errorKey: 'play.manualMoveStageIncomplete' };
    }
    const wip = wipEffective(params, members);
    const wipCols: ColumnId[] = ['analise', 'dev', 'teste'];
    if (wipCols.includes(toColumn) && board.columns[toColumn].length >= wip) {
      return {
        ok: false,
        errorKey: 'play.manualMoveWipFull',
        errorParams: { wip, col: toColumn },
      };
    }
    const notes: LogNote[] = [];
    applyAdvance(board, card, fromCol, toColumn, members, synergy, params, rng, notes, specialtyByTaskKind);
    if (
      enteredReadyDay[cardId] === undefined &&
      fromCol === 'backlog' &&
      toColumn === 'analise'
    ) {
      enteredReadyDay[cardId] = globalDay;
    }
    recordDeploys();
    if (logs.length > 0) {
      logs[logs.length - 1]!.columnCounts = countColumns(board);
    }
    return { ok: true };
  }

  return {
    getBoard: () => board,
    getLogs: () => logs,
    getCompleted: () => completed,
    updateCardAssignees,
    manualMoveCard,
    step: stepImpl,
    advanceUntilAfterRetro(): void {
      while (true) {
        const log = stepImpl();
        if (!log) return;
        if (log.ceremony === 'retrospective') return;
      }
    },
  };
}

/** Membros que não aparecem como assignees em nenhum cartão do quadro (qualquer coluna). */
export function membersNotAssignedToAnyCard(board: BoardState, members: Member[]): Member[] {
  const assigned = new Set<string>();
  for (const col of COLUMN_ORDER) {
    for (const cid of board.columns[col]) {
      const c = board.cardsById[cid];
      if (!c) continue;
      for (const aid of c.assigneeIds) {
        if (aid) assigned.add(aid);
      }
    }
  }
  return members.filter((m) => !assigned.has(m.id));
}

export function runSimulation(config: GameConfig): SimulationResult {
  const runner = createInteractiveRunner(config);
  let log: DayLog | null;
  while ((log = runner.step())) {
    void log;
  }
  return {
    logs: runner.getLogs(),
    completed: runner.getCompleted(),
    finalBoard: runner.getBoard(),
  };
}

export function ensureSynergyKeys(
  members: Member[],
  existing: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = { ...existing };
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const k = pairKey(members[i].id, members[j].id);
      if (out[k] === undefined) out[k] = 0;
    }
  }
  return out;
}
