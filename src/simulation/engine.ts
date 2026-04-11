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
  GameConfig,
  LogNote,
  Member,
  SimulationParams,
  SimulationResult,
  Specialty,
  SynergyRuntime,
} from './types';
import { COLUMN_ORDER, specialtyForColumn } from './types';

function addNote(
  notes: LogNote[],
  key: string,
  params?: Record<string, string | number>,
): void {
  notes.push(params ? { key, params } : { key });
}

function splitWork(p: number): { wa: number; wd: number; wt: number } {
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
  const { wa, wd, wt } = splitWork(c.points);
  return {
    ...c,
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
      ready: [],
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
): Member {
  const match = card.assigneeIds
    .map((id) => members.find((m) => m.id === id))
    .find((m) => m && m.specialty === stage);
  if (match) return match;
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

function wipEffective(params: SimulationParams, members: Member[]): number {
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
): void {
  const spFrom = specialtyForColumn(from);
  const spTo = specialtyForColumn(to);
  let handoffMult = 1;
  let reworkExtra = 0;
  if (spFrom && spTo) {
    const outM = ownerForStage(card, members, spFrom);
    const inM = ownerForStage(card, members, spTo);
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
  } else if (to === 'ready') {
    card.remainingInStage = 0;
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
): void {
  if (card.remainingInStage > 0) return;
  const nxt = nextColumn(col);
  if (!nxt) return;
  applyAdvance(board, card, col, nxt, members, synergy, p, rng, notes);
  if (card.remainingInStage === 0 && nxt !== 'deploy') {
    tryFinishStage(board, card, nxt, members, synergy, p, rng, notes);
  }
}

function pullReadyToAnalise(board: BoardState, wip: number, notes: LogNote[]): void {
  while (board.columns.analise.length < wip && board.columns.ready.length > 0) {
    const id = board.columns.ready.shift()!;
    const card = board.cardsById[id];
    moveCard(board, id, 'ready', 'analise');
    card.remainingInStage = card.workAnalise;
    addNote(notes, 'engine.pullReadyAnalise', { title: card.title });
  }
}

function planningStep(
  board: BoardState,
  params: SimulationParams,
  notes: LogNote[],
  globalDay: number,
  enteredReadyDay: Record<string, number>,
): void {
  let n = 0;
  while (
    n < params.planningPullMax &&
    board.columns.backlog.length > 0 &&
    board.columns.ready.length < params.planningPullMax
  ) {
    const id = board.columns.backlog.shift()!;
    moveCard(board, id, 'backlog', 'ready');
    enteredReadyDay[id] = globalDay;
    n++;
    addNote(notes, 'engine.planningToReady', { title: board.cardsById[id].title });
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
  if (!card.collaborative || card.assigneeIds.length < 2) return 1;
  const [a, b] = card.assigneeIds;
  const s = resolveSynergy(members, synergy.synergyByPair, a, b, {
    synergyPairBidirectional: synergy.synergyPairBidirectional,
    synergyDirected: synergy.synergyDirected,
    mode: 'collaboration',
  });
  const t = collabTraitBonus(members, [a, b]);
  return clamp(1 + p.synergyBeta * s + t, p.collabEffMin, p.collabEffMax);
}

/** Spend raw capacity `rawPool` on column; 1 raw unit applies `collabMult` effective work on Dev collaborative cards. Returns raw capacity consumed. */
function spendOnColumn(
  board: BoardState,
  col: ColumnId,
  rawPool: number,
  members: Member[],
  synergy: SynergyRuntime,
  p: SimulationParams,
  rng: Rng,
  notes: LogNote[],
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
    tryFinishStage(board, card, col, members, synergy, p, rng, notes);
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
  dayCapacityMultByMemberId?: Record<string, number>,
): void {
  const wip = wipEffective(params, members);
  pullReadyToAnalise(board, wip, notes);

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
    let rawCap = base;
    const sc = specialtyCol(m);
    if (sc && hasWork(sc)) {
      rawCap = Math.min(
        EFFECTIVE_DAILY_CAPACITY_MAX,
        Math.round(base * specialistMultiplier(m)),
      );
    }
    const capBonus = globalCapBonusBySpecialty[m.specialty] ?? 0;
    if (capBonus > 0) {
      rawCap = Math.min(
        EFFECTIVE_DAILY_CAPACITY_MAX,
        Math.round(rawCap * (1 + capBonus)),
      );
    }
    const dayMult = dayCapacityMultByMemberId?.[m.id];
    if (dayMult !== undefined && dayMult !== 1) {
      rawCap = Math.max(
        0,
        Math.min(EFFECTIVE_DAILY_CAPACITY_MAX, Math.round(rawCap * dayMult)),
      );
    }
    effectiveCapacityByMemberId[m.id] = rawCap;
    let left = rawCap;
    if (sc && hasWork(sc)) {
      left -= spendOnColumn(board, sc, left, members, synergy, params, rng, notes);
    }
    for (const { col } of WORK_COLS) {
      if (left <= 0) break;
      left -= spendOnColumn(board, col, left, members, synergy, params, rng, notes);
    }
  }
}

function countColumns(board: BoardState): Record<ColumnId, number> {
  const out = {} as Record<ColumnId, number>;
  for (const k of COLUMN_ORDER) out[k] = board.columns[k].length;
  return out;
}

function ceremonyFor(dayInSprint: number, days: number): CeremonyKind {
  if (dayInSprint === 1) return 'sprint_planning';
  if (dayInSprint === days) return 'sprint_review';
  return 'daily_scrum';
}

export type InteractiveRunner = {
  step: () => DayLog | null;
  /** Avança até processar uma Retrospectiva (fim lógico do sprint) ou até o jogo terminar. */
  advanceUntilAfterRetro: () => void;
  getBoard: () => BoardState;
  getLogs: () => DayLog[];
  getCompleted: () => CompletedCardTiming[];
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
      let dailyRandomEvents: DailyRandomEventLog[] | undefined;

      if (ceremony === 'sprint_planning') {
        planningStep(board, params, notes, globalDay, enteredReadyDay);
        pullReadyToAnalise(board, wipEffective(params, members), notes);
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

  return {
    getBoard: () => board,
    getLogs: () => logs,
    getCompleted: () => completed,
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
