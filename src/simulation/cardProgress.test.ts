import { describe, expect, it } from 'vitest';
import {
  blockCountForStage,
  buildStageBlockFilledMask,
  buildWorkFillPulse,
  buildWorkFillPulseFromSnapshots,
  completedWorkFraction,
  deliveredWorkBetweenSnapshots,
  filledBlocksInRow,
  sequentialConsumedAtFraction,
  snapshotCardWork,
  totalDoneAtSnapshot,
  workFillPulseDisplayMs,
  type WorkFillPulse,
} from './cardProgress';
import type { BoardCard, BoardState, CardWorkSnapshot } from './types';

function makeCard(over?: Partial<BoardCard>): BoardCard {
  return {
    id: over?.id ?? 'c1',
    title: over?.title ?? 'Card',
    points: over?.points ?? 10,
    taskKind: over?.taskKind ?? 'backend',
    assigneeIds: over?.assigneeIds ?? ['a'],
    workAnalise: over?.workAnalise ?? 3,
    workDev: over?.workDev ?? 5,
    workTeste: over?.workTeste ?? 2,
    remainingInStage: over?.remainingInStage ?? 0,
    businessValue: over?.businessValue,
    dueGlobalDay: over?.dueGlobalDay,
  };
}

function makeBoard(cards: BoardCard[], columns: BoardState['columns']): BoardState {
  const cardsById: BoardState['cardsById'] = {};
  for (const c of cards) cardsById[c.id] = c;
  return { columns, cardsById };
}

describe('completedWorkFraction', () => {
  const card = makeCard({ points: 10, workAnalise: 3, workDev: 5, workTeste: 2 });

  it('retorna 0 no backlog', () => {
    expect(completedWorkFraction(card, 'backlog', 999)).toBe(0);
  });

  it('calcula em análise', () => {
    expect(completedWorkFraction(card, 'analise', 1)).toBeCloseTo(0.2, 5);
  });

  it('calcula em dev', () => {
    expect(completedWorkFraction(card, 'dev', 2)).toBeCloseTo(0.6, 5);
  });

  it('calcula em testes', () => {
    expect(completedWorkFraction(card, 'teste', 1)).toBeCloseTo(0.9, 5);
  });

  it('retorna 1 em deploy', () => {
    expect(completedWorkFraction(card, 'deploy', 999)).toBe(1);
  });

  it('faz clamp para [0,1]', () => {
    expect(completedWorkFraction(card, 'analise', 99)).toBe(0);
    expect(completedWorkFraction(card, 'teste', -99)).toBe(1);
  });

  it('retorna 0 com points <= 0', () => {
    expect(completedWorkFraction(makeCard({ points: 0 }), 'dev', 0)).toBe(0);
    expect(completedWorkFraction(makeCard({ points: -5 }), 'dev', 0)).toBe(0);
  });
});

describe('snapshotCardWork', () => {
  it('captura coluna e remanescente dos cartões no quadro', () => {
    const c1 = makeCard({ id: 'c1', remainingInStage: 3 });
    const c2 = makeCard({ id: 'c2', remainingInStage: 1 });
    const board = makeBoard(
      [c1, c2],
      { backlog: ['c1'], analise: [], dev: ['c2'], teste: [], deploy: [] },
    );
    expect(snapshotCardWork(board)).toEqual({
      c1: { col: 'backlog', rem: 3 },
      c2: { col: 'dev', rem: 1 },
    });
  });
});

describe('blockCountForStage', () => {
  it('retorna 1 para workUnits <= 0', () => {
    expect(blockCountForStage(0)).toBe(1);
    expect(blockCountForStage(-7)).toBe(1);
  });

  it('arredonda para cima e limita em 24', () => {
    expect(blockCountForStage(1.1)).toBe(2);
    expect(blockCountForStage(4.01)).toBe(5);
    expect(blockCountForStage(999)).toBe(24);
  });
});

describe('sequentialConsumedAtFraction', () => {
  const card = makeCard({ points: 10, workAnalise: 3, workDev: 5, workTeste: 2 });

  it('distribui consumo na ordem análise -> dev -> testes', () => {
    expect(sequentialConsumedAtFraction(card, 0.5)).toEqual({ analysis: 3, dev: 2, test: 0 });
    expect(sequentialConsumedAtFraction(card, 0.8)).toEqual({ analysis: 3, dev: 5, test: 0 });
    expect(sequentialConsumedAtFraction(card, 0.9)).toEqual({ analysis: 3, dev: 5, test: 1 });
  });

  it('faz clamp de fração fora do intervalo', () => {
    expect(sequentialConsumedAtFraction(card, -1)).toEqual({ analysis: 0, dev: 0, test: 0 });
    expect(sequentialConsumedAtFraction(card, 5)).toEqual({ analysis: 3, dev: 5, test: 2 });
  });

  it('retorna zeros com points <= 0', () => {
    expect(sequentialConsumedAtFraction(makeCard({ points: 0 }), 0.8)).toEqual({
      analysis: 0,
      dev: 0,
      test: 0,
    });
  });
});

describe('filledBlocksInRow', () => {
  it('trata limites de etapa e done', () => {
    expect(filledBlocksInRow(1, 0, 5)).toBe(5);
    expect(filledBlocksInRow(0, 10, 5)).toBe(0);
    expect(filledBlocksInRow(-2, 10, 5)).toBe(0);
    expect(filledBlocksInRow(20, 10, 5)).toBe(5);
  });

  it('arredonda para cima proporcional e acende 1 bloco em avanço mínimo', () => {
    expect(filledBlocksInRow(0.01, 10, 5)).toBe(1);
    expect(filledBlocksInRow(2.49, 10, 5)).toBe(2);
    expect(filledBlocksInRow(2.5, 10, 5)).toBe(2);
    expect(filledBlocksInRow(8, 10, 5)).toBe(4);
  });
});

describe('totalDoneAtSnapshot', () => {
  const card = makeCard({ points: 10, workAnalise: 3, workDev: 5, workTeste: 2 });

  it('retorna 0 sem snapshot ou points <= 0', () => {
    expect(totalDoneAtSnapshot(card, undefined)).toBe(0);
    expect(totalDoneAtSnapshot(makeCard({ points: 0 }), { col: 'deploy', rem: 0 })).toBe(0);
  });

  it('calcula por coluna com clamp', () => {
    expect(totalDoneAtSnapshot(card, { col: 'backlog', rem: 999 })).toBe(0);
    expect(totalDoneAtSnapshot(card, { col: 'analise', rem: 1 })).toBe(2);
    expect(totalDoneAtSnapshot(card, { col: 'dev', rem: 2 })).toBe(6);
    expect(totalDoneAtSnapshot(card, { col: 'teste', rem: 1 })).toBe(9);
    expect(totalDoneAtSnapshot(card, { col: 'deploy', rem: 999 })).toBe(10);
    expect(totalDoneAtSnapshot(card, { col: 'teste', rem: -20 })).toBe(10);
  });
});

describe('deliveredWorkBetweenSnapshots', () => {
  it('soma apenas deltas positivos', () => {
    const c1 = makeCard({ id: 'c1', points: 10, workAnalise: 3, workDev: 5, workTeste: 2 });
    const c2 = makeCard({ id: 'c2', points: 8, workAnalise: 2, workDev: 4, workTeste: 2 });
    const board = makeBoard([c1, c2], {
      backlog: [],
      analise: ['c1'],
      dev: ['c2'],
      teste: [],
      deploy: [],
    });
    const prev: CardWorkSnapshot = {
      c1: { col: 'analise', rem: 3 },
      c2: { col: 'dev', rem: 4 },
    };
    const next: CardWorkSnapshot = {
      c1: { col: 'analise', rem: 1 }, // +2
      c2: { col: 'dev', rem: 5 }, // regressão (ignora)
    };
    expect(deliveredWorkBetweenSnapshots(prev, next, board)).toBe(2);
  });

  it('ignora cartões sem pontos ou ausentes em cardsById', () => {
    const board = makeBoard([makeCard({ id: 'c1', points: 0 })], {
      backlog: ['c1'],
      analise: [],
      dev: [],
      teste: [],
      deploy: [],
    });
    expect(
      deliveredWorkBetweenSnapshots(
        { c1: { col: 'backlog', rem: 0 }, ghost: { col: 'analise', rem: 0 } },
        { c1: { col: 'deploy', rem: 0 }, ghost: { col: 'deploy', rem: 0 } },
        board,
      ),
    ).toBe(0);
  });
});

describe('buildWorkFillPulseFromSnapshots', () => {
  it('retorna null quando não há avanço', () => {
    const c1 = makeCard({ id: 'c1' });
    const board = makeBoard([c1], {
      backlog: [],
      analise: ['c1'],
      dev: [],
      teste: [],
      deploy: [],
    });
    const prev: CardWorkSnapshot = { c1: { col: 'analise', rem: 2 } };
    const next: CardWorkSnapshot = { c1: { col: 'analise', rem: 2 } };
    expect(buildWorkFillPulseFromSnapshots(prev, next, board)).toBeNull();
  });

  it('retorna pulses só para cartões com avanço e pontos > 0', () => {
    const c1 = makeCard({ id: 'c1', points: 10, workAnalise: 3, workDev: 5, workTeste: 2 });
    const c2 = makeCard({ id: 'c2', points: 0 });
    const board = makeBoard([c1, c2], {
      backlog: [],
      analise: ['c1', 'c2'],
      dev: [],
      teste: [],
      deploy: [],
    });
    const prev: CardWorkSnapshot = {
      c1: { col: 'analise', rem: 3 },
      c2: { col: 'analise', rem: 3 },
    };
    const next: CardWorkSnapshot = {
      c1: { col: 'analise', rem: 1 },
      c2: { col: 'analise', rem: 1 },
    };
    expect(buildWorkFillPulseFromSnapshots(prev, next, board)).toEqual<WorkFillPulse>({
      c1: { from: 0, to: 0.2 },
    });
  });

  it('considera cartão novo em next com from=0', () => {
    const c1 = makeCard({ id: 'c1', points: 10, workAnalise: 3, workDev: 5, workTeste: 2 });
    const board = makeBoard([c1], {
      backlog: [],
      analise: ['c1'],
      dev: [],
      teste: [],
      deploy: [],
    });
    const prev: CardWorkSnapshot = {};
    const next: CardWorkSnapshot = { c1: { col: 'analise', rem: 2 } };
    expect(buildWorkFillPulseFromSnapshots(prev, next, board)).toEqual({
      c1: { from: 0, to: 0.1 },
    });
  });
});

describe('buildWorkFillPulse', () => {
  it('usa snapshotCardWork(board) como destino', () => {
    const c1 = makeCard({ id: 'c1', points: 10, workAnalise: 3, workDev: 5, workTeste: 2, remainingInStage: 1 });
    const board = makeBoard([c1], {
      backlog: [],
      analise: ['c1'],
      dev: [],
      teste: [],
      deploy: [],
    });
    const before: CardWorkSnapshot = { c1: { col: 'analise', rem: 3 } };
    expect(buildWorkFillPulse(before, board)).toEqual({
      c1: { from: 0, to: 0.2 },
    });
  });
});

describe('buildStageBlockFilledMask', () => {
  it('com frac 0 em análise deixa todos os quadrados apagados', () => {
    const card = makeCard({ points: 10, workAnalise: 3, workDev: 5, workTeste: 2 });
    const mask = buildStageBlockFilledMask(card, 'analise', 0);
    expect(mask.length).toBeGreaterThan(0);
    expect(mask.some(Boolean)).toBe(false);
  });

  it('com frac 1 em deploy acende toda a máscara', () => {
    const card = makeCard({ points: 10, workAnalise: 3, workDev: 5, workTeste: 2 });
    const mask = buildStageBlockFilledMask(card, 'deploy', 1);
    expect(mask.every(Boolean)).toBe(true);
  });
});

describe('workFillPulseDisplayMs', () => {
  it('usa duração base quando não há pulse', () => {
    expect(workFillPulseDisplayMs(null, makeBoard([], { backlog: [], analise: [], dev: [], teste: [], deploy: [] }))).toBe(
      720,
    );
  });
});
