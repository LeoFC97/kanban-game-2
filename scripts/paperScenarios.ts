import type { Card, GameConfig, Member, SimulationParams } from '../src/simulation/types';
import { ensureSynergyKeys } from '../src/simulation/engine';
import { pairKey } from '../src/simulation/synergy';

/** Parâmetros numéricos fixos nos experimentos (espelhar em `paper/data/parametros.tex` via `npm run paper:figures`). */
export const EXPERIMENT_PARAMS: SimulationParams = {
  daysPerSprint: 10,
  numSprints: 10,
  seed: 424242,
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
    collaborative: false,
    assigneeIds: ['ana'],
  },
  {
    id: 'h2',
    title: 'H2',
    points: 12,
    collaborative: true,
    assigneeIds: ['bru', 'car'],
  },
  {
    id: 'h3',
    title: 'H3',
    points: 9,
    collaborative: false,
    assigneeIds: ['bru'],
  },
  {
    id: 'h4',
    title: 'H4',
    points: 14,
    collaborative: true,
    assigneeIds: ['bru', 'car'],
  },
  {
    id: 'h5',
    title: 'H5',
    points: 11,
    collaborative: false,
    assigneeIds: ['car'],
  },
  {
    id: 'h6',
    title: 'H6',
    points: 13,
    collaborative: false,
    assigneeIds: ['dan'],
  },
  {
    id: 'h7',
    title: 'H7',
    points: 15,
    collaborative: false,
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
    title: 'A — Linha de base',
    config: game({}, membersBaseline),
  },
  {
    id: 'B_collab_synergy',
    title: 'B — Sinergia positiva entre os desenvolvedores',
    config: game({ [pairKey('bru', 'car')]: 0.88 }, membersBaseline),
  },
  {
    id: 'C_handoff_synergy',
    title: 'C — Sinergia negativa no handoff entre analista e desenvolvedor principal',
    config: game({ [pairKey('ana', 'bru')]: -0.82 }, membersBaseline),
  },
  {
    id: 'D_trait_hiperfoco',
    title: 'D — Defeito Hiperfoco no desenvolvedor principal',
    config: game(
      {},
      membersBaseline.map((m) =>
        m.id === 'bru' ? { ...m, traitFlawId: 'hiperfoco' } : { ...m },
      ),
    ),
  },
];
