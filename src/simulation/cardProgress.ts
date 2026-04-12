import type { BoardCard, BoardState, ColumnId } from './types';

const COLS: ColumnId[] = ['backlog', 'analise', 'dev', 'teste', 'deploy'];

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

export type CardWorkSnapshot = Record<string, { col: ColumnId; rem: number }>;

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

const MAX_BLOCKS_PER_STAGE = 10;

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

/** Quantos quadrados da linha ficam preenchidos (0…blockCount). */
export function filledBlocksInRow(doneInStage: number, stageTotal: number, blockCount: number): number {
  if (stageTotal <= 0) return blockCount;
  if (doneInStage <= 0) return 0;
  if (doneInStage >= stageTotal) return blockCount;
  return Math.min(blockCount, Math.floor((doneInStage / stageTotal) * blockCount + 1e-9));
}

/** Cartões em que o progresso total aumentou neste passo (ex.: após um dia de trabalho). */
export function buildWorkFillPulse(before: CardWorkSnapshot, board: BoardState): WorkFillPulse | null {
  const after = snapshotCardWork(board);
  const pulses: WorkFillPulse = {};
  for (const id of Object.keys(after)) {
    const card = board.cardsById[id];
    if (!card) continue;
    const a = after[id]!;
    const b = before[id];
    if (!b) continue;
    const fromR = completedWorkFraction(card, b.col, b.rem);
    const toR = completedWorkFraction(card, a.col, a.rem);
    if (toR > fromR + 1e-4) pulses[id] = { from: fromR, to: toR };
  }
  return Object.keys(pulses).length > 0 ? pulses : null;
}
