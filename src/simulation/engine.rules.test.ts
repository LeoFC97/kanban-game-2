import { describe, expect, it } from 'vitest';
import {
  canManuallyAdvanceCardFromColumn,
  cardToBoardCard,
  createInteractiveRunner,
  isManualCardMoveAllowed,
  resolveAssigneesForCard,
} from './engine';
import type { Card, ColumnId, GameConfig, Member } from './types';

const MEMBERS: Member[] = [
  { id: 'ana', name: 'Ana', specialty: 'Analista', deliveryMin: 3, deliveryMax: 3 },
  { id: 'bru', name: 'Bruno', specialty: 'Desenvolvedor', deliveryMin: 3, deliveryMax: 3 },
  { id: 'car', name: 'Carla', specialty: 'Testador', deliveryMin: 3, deliveryMax: 3 },
];

function baseParams(over?: Partial<GameConfig['params']>): GameConfig['params'] {
  return {
    daysPerSprint: 4,
    numSprints: 1,
    seed: 123,
    wipPerColumn: 3,
    planningPullMax: 3,
    synergyBeta: 0.1,
    synergyGamma: 0.1,
    collabEffMin: 0.85,
    collabEffMax: 1.15,
    handoffEffMin: 0.85,
    handoffEffMax: 1.15,
    handoffReworkSynergyThreshold: 0,
    reworkUnits: 1,
    dailyRandomEventChance: 0,
    ...over,
  };
}

function configWithCards(cards: Card[], over?: Partial<GameConfig['params']>): GameConfig {
  return {
    members: MEMBERS,
    synergyByPair: { 'ana|bru': 0, 'ana|car': 0, 'bru|car': 0 },
    backlogCards: cards,
    params: baseParams(over),
  };
}

describe('resolveAssigneesForCard', () => {
  const card = cardToBoardCard({
    id: 'c1',
    title: 'Card 1',
    points: 8,
    taskKind: 'backend',
    assigneeIds: ['ana'],
  });

  it('mantém ordem e filtra ids inválidos', () => {
    const r = resolveAssigneesForCard(card, MEMBERS, ['car', 'ghost', 'ana']);
    expect(r).toEqual({ ok: true, ids: ['car', 'ana'] });
  });

  it('erro para ids repetidos válidos', () => {
    const r = resolveAssigneesForCard(card, MEMBERS, ['ana', 'ana']);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorKey).toBe('errors.assigneesMustBeDistinct');
  });

  it('erro quando após filtrar não sobra ninguém', () => {
    const r = resolveAssigneesForCard(card, MEMBERS, ['ghost', 'nobody']);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errorKey).toBe('errors.cardOneAssignee');
  });
});

describe('isManualCardMoveAllowed', () => {
  const cols: ColumnId[] = ['backlog', 'analise', 'dev', 'teste', 'deploy'];
  const allowed = new Set(['backlog>analise', 'analise>dev', 'dev>teste', 'teste>deploy']);

  it('aceita apenas arestas forward previstas', () => {
    for (const from of cols) {
      for (const to of cols) {
        const key = `${from}>${to}`;
        expect(isManualCardMoveAllowed(from, to)).toBe(allowed.has(key));
      }
    }
  });
});

describe('canManuallyAdvanceCardFromColumn', () => {
  const ready = cardToBoardCard({
    id: 'c1',
    title: 'Ready',
    points: 8,
    taskKind: 'backend',
    assigneeIds: ['ana'],
  });
  ready.remainingInStage = 0;
  const blocked = cardToBoardCard({
    id: 'c2',
    title: 'Blocked',
    points: 8,
    taskKind: 'backend',
    assigneeIds: ['ana'],
  });
  blocked.remainingInStage = 2;

  it('permite sempre de backlog/deploy', () => {
    expect(canManuallyAdvanceCardFromColumn(blocked, 'backlog')).toBe(true);
    expect(canManuallyAdvanceCardFromColumn(blocked, 'deploy')).toBe(true);
  });

  it('exige remaining=0 em analise/dev/teste', () => {
    expect(canManuallyAdvanceCardFromColumn(ready, 'analise')).toBe(true);
    expect(canManuallyAdvanceCardFromColumn(ready, 'dev')).toBe(true);
    expect(canManuallyAdvanceCardFromColumn(ready, 'teste')).toBe(true);
    expect(canManuallyAdvanceCardFromColumn(blocked, 'analise')).toBe(false);
    expect(canManuallyAdvanceCardFromColumn(blocked, 'dev')).toBe(false);
    expect(canManuallyAdvanceCardFromColumn(blocked, 'teste')).toBe(false);
  });
});

describe('InteractiveRunner assignee + move rules', () => {
  it('bloqueia update assignees no backlog', () => {
    const r = createInteractiveRunner(
      configWithCards([{ id: 'c1', title: 'A', points: 8, taskKind: 'backend', assigneeIds: ['ana'] }], {
        planningPullMax: 0,
      }),
    );
    const u = r.updateCardAssignees('c1', ['bru']);
    expect(u.ok).toBe(false);
    if (!u.ok) expect(u.errorKey).toBe('play.assigneeReadOnlyBacklog');
  });

  it('detecta conflito de pessoa em 2 cartões ativos', () => {
    const r = createInteractiveRunner(
      configWithCards([
        { id: 'c1', title: 'A', points: 8, taskKind: 'backend', assigneeIds: ['ana'] },
        { id: 'c2', title: 'B', points: 8, taskKind: 'backend', assigneeIds: ['bru'] },
      ]),
    );
    const log = r.step(); // planning -> analise
    expect(log?.ceremony).toBe('sprint_planning');
    const u = r.updateCardAssignees('c2', ['ana']);
    expect(u.ok).toBe(false);
    if (!u.ok) expect(u.errorKey).toBe('errors.memberSingleActiveCard');
  });

  it('detecta conflito com alias de nome/id nos cartões ativos', () => {
    const cfg = configWithCards([
      { id: 'c1', title: 'A', points: 8, taskKind: 'backend', assigneeIds: ['Ana'] },
      { id: 'c2', title: 'B', points: 8, taskKind: 'backend', assigneeIds: ['bru'] },
    ]);
    cfg.members = [
      { id: 'ana-silva', name: 'Ana', specialty: 'Analista', deliveryMin: 3, deliveryMax: 3 },
      { id: 'bru', name: 'Bruno', specialty: 'Desenvolvedor', deliveryMin: 3, deliveryMax: 3 },
      { id: 'car', name: 'Carla', specialty: 'Testador', deliveryMin: 3, deliveryMax: 3 },
    ];
    cfg.synergyByPair = { 'ana-silva|bru': 0, 'ana-silva|car': 0, 'bru|car': 0 };
    const r = createInteractiveRunner(cfg);
    r.step();
    const u = r.updateCardAssignees('c2', ['ana-silva']);
    expect(u.ok).toBe(false);
    if (!u.ok) expect(u.errorKey).toBe('errors.memberSingleActiveCard');
  });

  it('aceita update válido após planning', () => {
    const r = createInteractiveRunner(
      configWithCards([{ id: 'c1', title: 'A', points: 8, taskKind: 'backend', assigneeIds: ['ana'] }]),
    );
    r.step();
    const u = r.updateCardAssignees('c1', ['bru']);
    expect(u).toEqual({ ok: true });
  });

  it('manualMoveCard retorna erro para cartão desconhecido', () => {
    const r = createInteractiveRunner(configWithCards([]));
    const m = r.manualMoveCard('ghost', 'analise');
    expect(m.ok).toBe(false);
    if (!m.ok) expect(m.errorKey).toBe('play.manualMoveUnknownCard');
  });

  it('manualMoveCard bloqueia aresta inválida', () => {
    const r = createInteractiveRunner(
      configWithCards([{ id: 'c1', title: 'A', points: 8, taskKind: 'backend', assigneeIds: ['ana'] }], {
        planningPullMax: 0,
      }),
    );
    const m = r.manualMoveCard('c1', 'dev');
    expect(m.ok).toBe(false);
    if (!m.ok) expect(m.errorKey).toBe('play.manualMoveNotAllowed');
  });

  it('manualMoveCard aplica WIP ao destino', () => {
    const r = createInteractiveRunner(
      configWithCards(
        [
          { id: 'c1', title: 'A', points: 8, taskKind: 'backend', assigneeIds: ['ana'] },
          { id: 'c2', title: 'B', points: 8, taskKind: 'backend', assigneeIds: ['bru'] },
        ],
        { planningPullMax: 0, wipPerColumn: 1 },
      ),
    );
    expect(r.manualMoveCard('c1', 'analise')).toEqual({ ok: true });
    const m2 = r.manualMoveCard('c2', 'analise');
    expect(m2.ok).toBe(false);
    if (!m2.ok) expect(m2.errorKey).toBe('play.manualMoveWipFull');
  });

  it('manualMoveCard exige remaining=0 para avançar de analise/dev/teste', () => {
    const r = createInteractiveRunner(
      configWithCards([{ id: 'c1', title: 'A', points: 8, taskKind: 'backend', assigneeIds: ['ana'] }], {
        planningPullMax: 0,
      }),
    );
    expect(r.manualMoveCard('c1', 'analise')).toEqual({ ok: true });
    const blocked = r.manualMoveCard('c1', 'dev');
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.errorKey).toBe('play.manualMoveStageIncomplete');
  });

  it('com autoAdvanceOnStageComplete false, ao terminar Análise o cartão fica em Análise até arrastar', () => {
    const r = createInteractiveRunner(
      configWithCards(
        [
          {
            id: 'c1',
            title: 'A',
            points: 5,
            workAnalise: 1,
            workDev: 2,
            workTeste: 2,
            taskKind: 'backend',
            assigneeIds: ['ana'],
          },
        ],
        { planningPullMax: 0, autoAdvanceOnStageComplete: false },
      ),
    );
    r.step();
    expect(r.manualMoveCard('c1', 'analise')).toEqual({ ok: true });
    r.step(); // daily: Ana gasta capacidade na Análise
    const b = r.getBoard();
    expect(b.columns.analise).toContain('c1');
    expect(b.columns.dev).not.toContain('c1');
    expect(b.cardsById['c1']!.remainingInStage).toBe(0);
  });

  it('com clearAssigneesAfterEachDay true, limpa assignees das tasks ativas ao fim do dia', () => {
    const r = createInteractiveRunner(
      configWithCards(
        [
          {
            id: 'c1',
            title: 'A',
            points: 7,
            workAnalise: 4,
            workDev: 2,
            workTeste: 1,
            taskKind: 'backend',
            assigneeIds: ['ana'],
          },
        ],
        {
          planningPullMax: 0,
          autoAdvanceOnStageComplete: false,
          clearAssigneesAfterEachDay: true,
        },
      ),
    );
    r.step(); // planning
    expect(r.manualMoveCard('c1', 'analise')).toEqual({ ok: true });
    expect(r.getBoard().cardsById['c1']!.assigneeIds).toEqual(['ana']);
    r.step(); // daily
    expect(r.getBoard().cardsById['c1']!.assigneeIds).toEqual([]);
  });

  it('manualMoveCard atualiza columnCounts do último log', () => {
    const r = createInteractiveRunner(
      configWithCards([{ id: 'c1', title: 'A', points: 8, taskKind: 'backend', assigneeIds: ['ana'] }], {
        planningPullMax: 0,
      }),
    );
    const log = r.step();
    expect(log?.ceremony).toBe('sprint_planning');
    const m = r.manualMoveCard('c1', 'analise');
    expect(m.ok).toBe(true);
    const last = r.getLogs()[r.getLogs().length - 1]!;
    expect(last.columnCounts.backlog).toBe(0);
    expect(last.columnCounts.analise).toBe(1);
  });

  it('cartão em coluna ativa sem responsáveis não progride no daily', () => {
    const r = createInteractiveRunner(
      configWithCards(
        [
          {
            id: 'c1',
            title: 'A',
            points: 5,
            workAnalise: 2,
            workDev: 2,
            workTeste: 1,
            taskKind: 'backend',
            assigneeIds: ['ana'],
          },
        ],
        {
          planningPullMax: 0,
          autoAdvanceOnStageComplete: false,
          clearAssigneesAfterEachDay: true,
        },
      ),
    );
    r.step(); // planning
    expect(r.manualMoveCard('c1', 'analise')).toEqual({ ok: true });
    expect(r.getBoard().cardsById['c1']!.assigneeIds).toEqual(['ana']);
    r.step(); // daily 1: Ana trabalha, depois assignees limpos
    const remAfterDay1 = r.getBoard().cardsById['c1']!.remainingInStage;
    expect(r.getBoard().cardsById['c1']!.assigneeIds).toEqual([]);
    r.step(); // daily 2: cartão sem assignees, nenhum progresso
    const remAfterDay2 = r.getBoard().cardsById['c1']!.remainingInStage;
    expect(remAfterDay2).toBe(remAfterDay1);
  });

  it('advanceUntilAfterRetro para na retrospectiva', () => {
    const r = createInteractiveRunner(
      configWithCards([{ id: 'c1', title: 'A', points: 8, taskKind: 'backend', assigneeIds: ['ana'] }], {
        daysPerSprint: 3,
      }),
    );
    r.advanceUntilAfterRetro();
    const last = r.getLogs()[r.getLogs().length - 1]!;
    expect(last.ceremony).toBe('retrospective');
  });
});
