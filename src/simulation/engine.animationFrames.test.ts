import { describe, expect, it } from 'vitest';
import { createInteractiveRunner } from './engine';
import { snapshotCardWork } from './cardProgress';
import type { Card, GameConfig, Member } from './types';

const members: Member[] = [
  { id: 'a', name: 'Ana', specialty: 'Analista', deliveryMin: 3, deliveryMax: 3 },
  { id: 'b', name: 'Bruno', specialty: 'Desenvolvedor', deliveryMin: 2, deliveryMax: 2 },
];

const backlogCard: Card = {
  id: 'c1',
  title: 'Tarefa',
  points: 8,
  taskKind: 'backend',
  assigneeIds: ['a', 'b'],
};

function minimalConfig(over?: Partial<GameConfig['params']>): GameConfig {
  return {
    members,
    synergyByPair: { 'a|b': 0 },
    backlogCards: [backlogCard],
    params: {
      daysPerSprint: 5,
      numSprints: 1,
      seed: 42,
      wipPerColumn: 4,
      planningPullMax: 2,
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
    },
  };
}

describe('workAnimationFrames no DayLog', () => {
  it('em Daily inclui snapshot após pull e um após cada membro; o último coincide com o quadro', () => {
    const r = createInteractiveRunner(minimalConfig());
    const log1 = r.step();
    expect(log1?.ceremony).toBe('sprint_planning');
    const log2 = r.step();
    expect(log2?.ceremony).toBe('daily_scrum');
    const frames = log2?.workAnimationFrames;
    expect(frames?.length).toBe(1 + members.length);
    const last = frames![frames!.length - 1]!;
    expect(last).toEqual(snapshotCardWork(r.getBoard()));
  });

  it('em Planning não inclui workAnimationFrames', () => {
    const r = createInteractiveRunner(minimalConfig());
    const log1 = r.step();
    expect(log1?.workAnimationFrames).toBeUndefined();
  });
});
