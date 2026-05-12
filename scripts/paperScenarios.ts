import type { Card, GameConfig, Member, SimulationParams } from '../src/simulation/types';
import { ensureSynergyKeys } from '../src/simulation/engine';
import { pairKey } from '../src/simulation/synergy';

/** Fixed numeric parameters for experiments (mirrored in `paper/data/parametros.tex` via `npm run paper:figures`). */
export const EXPERIMENT_PARAMS: SimulationParams = {
  daysPerSprint: 10,
  numSprints: 10,
  seed: 424242,
  wipPerColumn: 3,
  planningPullMax: 6,
  autoAdvanceOnStageComplete: true,
  clearAssigneesAfterEachDay: false,
  synergyBeta: 0.38,
  synergyGamma: 0.42,
  collabEffMin: 0.72,
  collabEffMax: 1.38,
  handoffEffMin: 0.68,
  handoffEffMax: 1.28,
  handoffReworkSynergyThreshold: -0.12,
  reworkUnits: 2,
  dailyRandomEventChance: 0,
  financialLateFlatPenalty: 0,
  financialLatePerDayPenalty: 0,
  financialNotDeliveredMultiplier: 0,
};

const membersBaseline: Member[] = [
  { id: 'ana', name: 'Ana', specialty: 'Analista' },
  { id: 'bru', name: 'Bruno', specialty: 'Desenvolvedor' },
  { id: 'car', name: 'Carla', specialty: 'Desenvolvedor' },
  { id: 'dan', name: 'Dante', specialty: 'Testador' },
];

const backlog: Card[] = [
  {
    id: 'h1',
    title: 'H1',
    points: 10,
    taskKind: 'backend',
    assigneeIds: ['ana'],
  },
  {
    id: 'h2',
    title: 'H2',
    points: 12,
    taskKind: 'backend',
    assigneeIds: ['bru', 'car'],
  },
  {
    id: 'h3',
    title: 'H3',
    points: 9,
    taskKind: 'backend',
    assigneeIds: ['bru'],
  },
  {
    id: 'h4',
    title: 'H4',
    points: 14,
    taskKind: 'backend',
    assigneeIds: ['bru', 'car'],
  },
  {
    id: 'h5',
    title: 'H5',
    points: 11,
    taskKind: 'backend',
    assigneeIds: ['car'],
  },
  {
    id: 'h6',
    title: 'H6',
    points: 13,
    taskKind: 'backend',
    assigneeIds: ['dan'],
  },
  {
    id: 'h7',
    title: 'H7',
    points: 15,
    taskKind: 'backend',
    assigneeIds: ['bru'],
  },
];

function game(synergy: Record<string, number>, members: Member[]): GameConfig {
  return {
    members,
    synergyByPair: ensureSynergyKeys(members, synergy),
    backlogCards: backlog.map((c) => ({ ...c })),
    params: { ...EXPERIMENT_PARAMS },
  };
}

export const SCENARIOS: { id: string; title: string; config: GameConfig }[] = [
  {
    id: 'A_baseline',
    title: 'A — Referência',
    config: game({}, membersBaseline),
  },
  {
    id: 'B_collab_synergy',
    title: 'B — Sinergia positiva entre desenvolvedores',
    config: game({ [pairKey('bru', 'car')]: 0.88 }, membersBaseline),
  },
  {
    id: 'C_handoff_synergy',
    title: 'C — Sinergia negativa no repasse analista–desenvolvedor líder',
    config: game({ [pairKey('ana', 'bru')]: -0.82 }, membersBaseline),
  },
  {
    id: 'D_sinergia_combinada',
    title: 'D — Sinergia positiva no par de dev e negativa no repasse analista–líder',
    config: game(
      {
        [pairKey('bru', 'car')]: 0.88,
        [pairKey('ana', 'bru')]: -0.82,
      },
      membersBaseline,
    ),
  },
];
