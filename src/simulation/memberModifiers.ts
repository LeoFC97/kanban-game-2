import type { Member, TraitEffects } from './types';

const empty: TraitEffects = {
  diceMaxDelta: 0,
  specialistBonusDelta: 0,
  handoffMultiplierDelta: 0,
  collabMultiplierDelta: 0,
  maxWipDelta: 0,
  reworkChanceDelta: 0,
};

/** Agregado numérico por membro (reservado a extensões; sem catálogo de traços, permanece zero). */
export function resolveMemberModifiers(member: Member): TraitEffects {
  void member;
  return { ...empty };
}
