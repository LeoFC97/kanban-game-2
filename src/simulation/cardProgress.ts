import type { BoardCard, BoardState, CardWorkSnapshot, ColumnId } from './types';
import { COLUMN_ORDER } from './types';

const COLS: ColumnId[] = ['backlog', 'analise', 'dev', 'teste', 'deploy'];

function columnOfCard(board: BoardState, cardId: string): ColumnId | null {
  for (const col of COLUMN_ORDER) {
    if (board.columns[col].includes(cardId)) return col;
  }
  return null;
}

/** Fração 0–1 do esforço total do cartão (`points`) já consumido, dada coluna e remanescente na etapa. */
export function completedWorkFraction(
  card: BoardCard,
  col: ColumnId,
  remainingInStage: number,
): number {
  const p = card.points;
  if (p <= 0) return 0;
  let done = 0;
  switch (col) {
    case 'backlog':
      return 0;
    case 'analise':
      done = card.workAnalise - remainingInStage;
      break;
    case 'dev':
      done = card.workAnalise + (card.workDev - remainingInStage);
      break;
    case 'teste':
      done = card.workAnalise + card.workDev + (card.workTeste - remainingInStage);
      break;
    case 'deploy':
      return 1;
    default:
      return 0;
  }
  return Math.min(1, Math.max(0, done / p));
}

export function snapshotCardWork(board: BoardState): CardWorkSnapshot {
  const out: CardWorkSnapshot = {};
  for (const col of COLS) {
    for (const id of board.columns[col]) {
      const c = board.cardsById[id];
      if (c) out[id] = { col, rem: c.remainingInStage };
    }
  }
  return out;
}

export type WorkFillPulse = Record<string, { from: number; to: number }>;

const MAX_BLOCKS_PER_STAGE = 24;

/** Duração da animação dos quadrados de progresso na UI (ms). */
export const CARD_TASK_PROGRESS_ANIM_MS = 720;

/** N.º de quadrados por etapa (proporcional ao trabalho, com teto para caber no cartão). */
export function blockCountForStage(workUnits: number): number {
  if (workUnits <= 0) return 1;
  return Math.min(MAX_BLOCKS_PER_STAGE, Math.max(1, Math.ceil(workUnits)));
}

/**
 * Esforço já consumido em cada etapa se a fração global do cartão for `frac` (0–1),
 * na ordem Análise → Dev → Testes (alinhado a `completedWorkFraction`).
 */
export function sequentialConsumedAtFraction(
  card: BoardCard,
  frac: number,
): { analysis: number; dev: number; test: number } {
  const p = card.points;
  if (p <= 0) return { analysis: 0, dev: 0, test: 0 };
  const cap = Math.max(0, Math.min(1, frac)) * p;
  let r = cap;
  const analysis = Math.min(card.workAnalise, r);
  r -= analysis;
  const dev = Math.min(card.workDev, r);
  r -= dev;
  const test = Math.min(card.workTeste, r);
  return { analysis, dev, test };
}

/**
 * Máscara dos quadrados da UI (ordem: Análise esq→dir, Dev, Testes, Deploy),
 * coerente com `CardTaskStageBlocks` para uma fração global `frac` (0…1).
 */
export function buildStageBlockFilledMask(card: BoardCard, columnId: ColumnId, frac: number): boolean[] {
  if (card.points <= 0) return [];
  const f = Math.max(0, Math.min(1, frac));
  const nA = blockCountForStage(card.workAnalise);
  const nD = blockCountForStage(card.workDev);
  const nT = blockCountForStage(card.workTeste);
  const seq = sequentialConsumedAtFraction(card, f);
  const filledA = filledBlocksInRow(seq.analysis, card.workAnalise, nA);
  const filledD = filledBlocksInRow(seq.dev, card.workDev, nD);
  const filledT = filledBlocksInRow(seq.test, card.workTeste, nT);
  const deployFilled = f >= 1 - 1e-9 || columnId === 'deploy';
  const mask: boolean[] = [];
  for (let j = 0; j < nA; j++) mask.push(j < filledA);
  for (let j = 0; j < nD; j++) mask.push(j < filledD);
  for (let j = 0; j < nT; j++) mask.push(j < filledT);
  mask.push(deployFilled);
  return mask;
}

/** Quantos quadrados da linha ficam preenchidos (0…blockCount). */
export function filledBlocksInRow(doneInStage: number, stageTotal: number, blockCount: number): number {
  if (stageTotal <= 0) return blockCount;
  if (doneInStage <= 0) return 0;
  if (doneInStage >= stageTotal) return blockCount;
  // Mostra progresso cedo na UI: qualquer avanço > 0 já acende pelo menos 1 bloco.
  return Math.min(blockCount, Math.max(1, Math.ceil((doneInStage / stageTotal) * blockCount - 1e-9)));
}

/** Esforço total já concluído no snapshot de um cartão (0…`points`). */
export function totalDoneAtSnapshot(
  card: BoardCard,
  snap: { col: ColumnId; rem: number } | undefined,
): number {
  if (!snap || card.points <= 0) return 0;
  switch (snap.col) {
    case 'backlog':
      return 0;
    case 'analise':
      return Math.max(0, Math.min(card.points, card.workAnalise - snap.rem));
    case 'dev':
      return Math.max(0, Math.min(card.points, card.workAnalise + card.workDev - snap.rem));
    case 'teste':
      return Math.max(
        0,
        Math.min(card.points, card.workAnalise + card.workDev + card.workTeste - snap.rem),
      );
    case 'deploy':
      return card.points;
    default:
      return 0;
  }
}

/** Delta positivo de trabalho concluído entre dois snapshots (somado em todos os cartões). */
export function deliveredWorkBetweenSnapshots(
  prevSnap: CardWorkSnapshot,
  nextSnap: CardWorkSnapshot,
  board: BoardState,
): number {
  let delivered = 0;
  const ids = new Set([...Object.keys(prevSnap), ...Object.keys(nextSnap)]);
  for (const id of ids) {
    const card = board.cardsById[id];
    if (!card || card.points <= 0) continue;
    const from = totalDoneAtSnapshot(card, prevSnap[id]);
    const to = totalDoneAtSnapshot(card, nextSnap[id]);
    if (to > from) delivered += to - from;
  }
  return delivered;
}

/** Cartões em que a fração de progresso global aumenta entre dois snapshots (mesmo `BoardCard` final). */
export function buildWorkFillPulseFromSnapshots(
  prevSnap: CardWorkSnapshot,
  nextSnap: CardWorkSnapshot,
  board: BoardState,
): WorkFillPulse | null {
  const pulses: WorkFillPulse = {};
  const ids = new Set([...Object.keys(prevSnap), ...Object.keys(nextSnap)]);
  for (const id of ids) {
    const card = board.cardsById[id];
    if (!card || card.points <= 0) continue;
    const a = nextSnap[id];
    const b = prevSnap[id];
    if (!a) continue;
    const fromR = b ? completedWorkFraction(card, b.col, b.rem) : 0;
    const toR = completedWorkFraction(card, a.col, a.rem);
    if (toR > fromR + 1e-4) pulses[id] = { from: fromR, to: toR };
  }
  return Object.keys(pulses).length > 0 ? pulses : null;
}

/** Cartões em que o progresso total aumentou neste passo (ex.: após um dia de trabalho). */
export function buildWorkFillPulse(before: CardWorkSnapshot, board: BoardState): WorkFillPulse | null {
  return buildWorkFillPulseFromSnapshots(before, snapshotCardWork(board), board);
}

/** ms por novo quadrado na animação sequencial (UI). */
export const WORK_FILL_MS_PER_BLOCK = 500;

/** Pausa final após o último quadrado (UI). */
export const WORK_FILL_TAIL_MS = 180;

/** Duração máxima da animação de preenchimento (vários cartões). */
export const WORK_FILL_MAX_UI_MS = 90_000;

/**
 * Tempo até o modal de resumo do dia (ou equivalente) esperar a animação dos quadrados terminar.
 */
export function workFillPulseDisplayMs(pulse: WorkFillPulse | null, board: BoardState): number {
  if (!pulse || Object.keys(pulse).length === 0) {
    return CARD_TASK_PROGRESS_ANIM_MS;
  }
  let maxMs = CARD_TASK_PROGRESS_ANIM_MS;
  for (const id of Object.keys(pulse)) {
    const card = board.cardsById[id];
    if (!card || card.points <= 0) continue;
    const col = columnOfCard(board, id) ?? 'analise';
    const { from, to } = pulse[id]!;
    const a = buildStageBlockFilledMask(card, col, from);
    const b = buildStageBlockFilledMask(card, col, to);
    let newBlocks = 0;
    for (let i = 0; i < b.length; i++) {
      if (b[i] && !a[i]) newBlocks++;
    }
    maxMs = Math.max(maxMs, newBlocks * WORK_FILL_MS_PER_BLOCK + WORK_FILL_TAIL_MS);
  }
  return Math.min(WORK_FILL_MAX_UI_MS, maxMs);
}
