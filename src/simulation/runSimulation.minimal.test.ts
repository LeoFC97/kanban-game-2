import { describe, expect, it } from 'vitest';
import type { Card, GameConfig, Member } from './types';
import { ensureSynergyKeys, runSimulation } from './engine';

function tinyConfig(): GameConfig {
  const members: Member[] = [
    { id: 'ana', name: 'Ana', specialty: 'Analista' },
    { id: 'bru', name: 'Bruno', specialty: 'Desenvolvedor' },
    { id: 'dan', name: 'Dante', specialty: 'Testador' },
  ];
  const backlogCards: Card[] = [
    {
      id: 'c1',
      title: 'Mini',
      points: 4,
      taskKind: 'backend',
      assigneeIds: ['ana'],
    },
  ];
  return {
    members,
    synergyByPair: ensureSynergyKeys(members, {}),
    backlogCards,
    params: {
      daysPerSprint: 5,
      numSprints: 2,
      seed: 7_007_007,
      wipPerColumn: 3,
      planningPullMax: 6,
      synergyBeta: 0.38,
      synergyGamma: 0.42,
      collabEffMin: 0.72,
      collabEffMax: 1.38,
      handoffEffMin: 0.68,
      handoffEffMax: 1.28,
      handoffReworkSynergyThreshold: -0.12,
      reworkUnits: 2,
      financialLateFlatPenalty: 0,
      financialLatePerDayPenalty: 0,
      financialNotDeliveredMultiplier: 0,
    },
  };
}

describe('runSimulation', () => {
  it('termina e devolve logs para configuração mínima', () => {
    const { logs, completed, finalBoard } = runSimulation(tinyConfig());
    expect(logs.length).toBeGreaterThan(0);
    expect(finalBoard).toBeDefined();
    expect(Array.isArray(completed)).toBe(true);
  });

  it('é determinística para a mesma configuração', () => {
    const c = tinyConfig();
    const a = runSimulation(c);
    const b = runSimulation(tinyConfig());
    expect(a.logs.length).toBe(b.logs.length);
    expect(a.completed.length).toBe(b.completed.length);
    expect(a.completed.map((x) => x.cycleTimeDays)).toEqual(
      b.completed.map((x) => x.cycleTimeDays),
    );
  });
});
