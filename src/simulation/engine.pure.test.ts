import { describe, expect, it } from 'vitest';
import {
  cardToBoardCard,
  diceMaxForMember,
  ensureSynergyKeys,
  hasAnyCardOutsideBacklog,
  membersAssignedToMultipleWorkCards,
  membersNotAssignedToAnyCard,
  splitWork,
} from './engine';
import type { BoardState, Card, Member } from './types';

describe('splitWork', () => {
  it('com p <= 0 devolve zeros', () => {
    expect(splitWork(0)).toEqual({ wa: 0, wd: 0, wt: 0 });
    expect(splitWork(-3)).toEqual({ wa: 0, wd: 0, wt: 0 });
  });

  it('para p >= 3 soma as partes ao total e mantém componentes >= 1', () => {
    for (const p of [3, 5, 10, 11, 24, 100]) {
      const { wa, wd, wt } = splitWork(p);
      expect(wa + wd + wt).toBe(p);
      expect(wa).toBeGreaterThanOrEqual(1);
      expect(wd).toBeGreaterThanOrEqual(1);
      expect(wt).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('diceMaxForMember', () => {
  it('fica entre 2 e 8 sem traços', () => {
    const m: Member = {
      id: 'x',
      name: 'X',
      specialty: 'Desenvolvedor',
    };
    expect(diceMaxForMember(m)).toBe(6);
  });

});

describe('ensureSynergyKeys', () => {
  it('preenche todas as chaves de pares com zero quando vazio', () => {
    const members: Member[] = [
      { id: 'a', name: 'A', specialty: 'Analista' },
      { id: 'b', name: 'B', specialty: 'Desenvolvedor' },
    ];
    const out = ensureSynergyKeys(members, {});
    expect(out['a|b']).toBe(0);
    expect(Object.keys(out).length).toBe(1);
  });
});

function boardWith(cards: Card[], columns: BoardState['columns']): BoardState {
  const cardsById: BoardState['cardsById'] = {};
  for (const c of cards) {
    cardsById[c.id] = cardToBoardCard(c);
  }
  return { columns, cardsById };
}

describe('backlog vs alocação', () => {
  const members: Member[] = [
    { id: 'a', name: 'A', specialty: 'Analista' },
    { id: 'b', name: 'B', specialty: 'Desenvolvedor' },
  ];
  const card: Card = {
    id: 'c1',
    title: 'T',
    points: 5,
    taskKind: 'backend',
    assigneeIds: ['a'],
  };

  it('hasAnyCardOutsideBacklog é falso só com cartões no backlog', () => {
    const board = boardWith([card], {
      backlog: ['c1'],
      analise: [],
      dev: [],
      teste: [],
      deploy: [],
    });
    expect(hasAnyCardOutsideBacklog(board)).toBe(false);
  });

  it('membersNotAssignedToAnyCard ignora assignees só no backlog', () => {
    const board = boardWith([card], {
      backlog: ['c1'],
      analise: [],
      dev: [],
      teste: [],
      deploy: [],
    });
    expect(membersNotAssignedToAnyCard(board, members).map((m) => m.id).sort()).toEqual(['a', 'b']);
  });

  it('com cartão em analise e assignee, deixa de contar como em falta', () => {
    const board = boardWith([card], {
      backlog: [],
      analise: ['c1'],
      dev: [],
      teste: [],
      deploy: [],
    });
    expect(hasAnyCardOutsideBacklog(board)).toBe(true);
    expect(membersNotAssignedToAnyCard(board, members).map((m) => m.id)).toEqual(['b']);
  });
});

describe('membersAssignedToMultipleWorkCards', () => {
  const members: Member[] = [
    { id: 'a', name: 'Ana', specialty: 'Analista' },
    { id: 'b', name: 'Bruno', specialty: 'Desenvolvedor' },
    { id: 'c', name: 'Carla', specialty: 'Testador' },
  ];

  it('conta apenas colunas ativas (analise/dev/teste), ignorando backlog e deploy', () => {
    const cards: Card[] = [
      { id: 'c1', title: 'A', points: 8, taskKind: 'backend', assigneeIds: ['a'] },
      { id: 'c2', title: 'B', points: 8, taskKind: 'backend', assigneeIds: ['a'] },
      { id: 'c3', title: 'C', points: 8, taskKind: 'backend', assigneeIds: ['b'] },
      { id: 'c4', title: 'D', points: 8, taskKind: 'backend', assigneeIds: ['a'] },
    ];
    const board = boardWith(cards, {
      backlog: ['c4'],
      analise: ['c1'],
      dev: ['c2'],
      teste: [],
      deploy: ['c3'],
    });
    expect(membersAssignedToMultipleWorkCards(board, members).map((m) => m.id)).toEqual(['a']);
  });

  it('não acusa conflito quando a pessoa aparece só uma vez em colunas ativas', () => {
    const cards: Card[] = [
      { id: 'c1', title: 'A', points: 8, taskKind: 'backend', assigneeIds: ['a'] },
      { id: 'c2', title: 'B', points: 8, taskKind: 'backend', assigneeIds: ['b'] },
    ];
    const board = boardWith(cards, {
      backlog: [],
      analise: ['c1'],
      dev: ['c2'],
      teste: [],
      deploy: [],
    });
    expect(membersAssignedToMultipleWorkCards(board, members)).toEqual([]);
  });

  it('resolve assignee por variação de nome/id (acentos, caixa e separadores)', () => {
    const membersAlias: Member[] = [
      { id: 'ana-silva', name: 'Ana Silva', specialty: 'Analista' },
      { id: 'bruno-dev', name: 'Bruno Dev', specialty: 'Desenvolvedor' },
    ];
    const cards: Card[] = [
      { id: 'c1', title: 'A', points: 8, taskKind: 'backend', assigneeIds: ['ANA SILVA'] },
      { id: 'c2', title: 'B', points: 8, taskKind: 'backend', assigneeIds: ['ana_silva'] },
      { id: 'c3', title: 'C', points: 8, taskKind: 'backend', assigneeIds: ['Bruno-Dev'] },
    ];
    const board = boardWith(cards, {
      backlog: [],
      analise: ['c1'],
      dev: ['c2'],
      teste: ['c3'],
      deploy: [],
    });
    expect(membersAssignedToMultipleWorkCards(board, membersAlias).map((m) => m.id)).toEqual([
      'ana-silva',
    ]);
  });
});
