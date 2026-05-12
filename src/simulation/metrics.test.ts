import { describe, expect, it } from 'vitest';
import { buildCfdSeries, buildCumulativeFlowSeries } from './metrics';
import type { DayLog } from './types';

describe('buildCfdSeries', () => {
  it('devolve array vazio para logs vazios', () => {
    expect(buildCfdSeries([])).toEqual([]);
  });

  it('copia contagens por coluna de cada log', () => {
    const logs: DayLog[] = [
      {
        globalDay: 1,
        sprint: 1,
        dayInSprint: 1,
        ceremony: 'sprint_planning',
        diceByMemberId: {},
        effectiveCapacityByMemberId: {},
        columnCounts: {
          backlog: 2,
          analise: 0,
          dev: 0,
          teste: 0,
          deploy: 0,
        },
        notes: [],
      },
    ];
    const rows = buildCfdSeries(logs);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.globalDay).toBe(1);
    expect(rows[0]!.backlog).toBe(2);
    expect(rows[0]!.deploy).toBe(0);
  });
});

describe('buildCumulativeFlowSeries', () => {
  it('soma cumulativa de Deploy para Backlog (cada banda inclui as anteriores downstream)', () => {
    const logs: DayLog[] = [
      {
        globalDay: 5,
        sprint: 1,
        dayInSprint: 5,
        ceremony: 'daily_scrum',
        diceByMemberId: {},
        effectiveCapacityByMemberId: {},
        columnCounts: {
          backlog: 3,
          analise: 2,
          dev: 1,
          teste: 1,
          deploy: 2,
        },
        notes: [],
      },
    ];
    const rows = buildCumulativeFlowSeries(logs);
    expect(rows[0]!.deploy).toBe(2); // só count(deploy)
    expect(rows[0]!.teste).toBe(3); // teste + deploy
    expect(rows[0]!.dev).toBe(4); // dev + teste + deploy
    expect(rows[0]!.analise).toBe(6); // analise + dev + teste + deploy
    expect(rows[0]!.backlog).toBe(9); // total
  });

  it('totais batem com soma de columnCounts', () => {
    const cols = { backlog: 4, analise: 1, dev: 2, teste: 0, deploy: 3 };
    const logs: DayLog[] = [
      {
        globalDay: 1,
        sprint: 1,
        dayInSprint: 1,
        ceremony: 'daily_scrum',
        diceByMemberId: {},
        effectiveCapacityByMemberId: {},
        columnCounts: cols,
        notes: [],
      },
    ];
    const rows = buildCumulativeFlowSeries(logs);
    const total = cols.backlog + cols.analise + cols.dev + cols.teste + cols.deploy;
    expect(rows[0]!.backlog).toBe(total);
  });
});
