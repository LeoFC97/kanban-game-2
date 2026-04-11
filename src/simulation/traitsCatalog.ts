import type { TraitDefinition } from './types';

const zero = {
  diceMaxDelta: 0,
  specialistBonusDelta: 0,
  handoffMultiplierDelta: 0,
  collabMultiplierDelta: 0,
  maxWipDelta: 0,
  reworkChanceDelta: 0,
};

export const TRAITS: TraitDefinition[] = [
  {
    id: 'comunicador',
    kind: 'quality',
    effects: { ...zero, handoffMultiplierDelta: 0.08 },
  },
  {
    id: 'mentor',
    kind: 'quality',
    effects: { ...zero, collabMultiplierDelta: 0.06 },
  },
  {
    id: 'veterano',
    kind: 'quality',
    effects: { ...zero, specialistBonusDelta: 0.25 },
  },
  {
    id: 'hiperfoco',
    kind: 'flaw',
    effects: { ...zero, diceMaxDelta: -1 },
  },
  {
    id: 'evita_conflito',
    kind: 'flaw',
    effects: { ...zero, collabMultiplierDelta: -0.08 },
  },
  {
    id: 'silos',
    kind: 'flaw',
    effects: { ...zero, handoffMultiplierDelta: -0.1 },
  },
];

export const traitById: Record<string, TraitDefinition> = Object.fromEntries(
  TRAITS.map((t) => [t.id, t]),
);
