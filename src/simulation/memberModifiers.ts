import type { Member, TraitEffects } from './types';
import { traitById } from './traitsCatalog';

const empty: TraitEffects = {
  diceMaxDelta: 0,
  specialistBonusDelta: 0,
  handoffMultiplierDelta: 0,
  collabMultiplierDelta: 0,
  maxWipDelta: 0,
  reworkChanceDelta: 0,
};

function add(a: TraitEffects, b: TraitEffects): TraitEffects {
  return {
    diceMaxDelta: a.diceMaxDelta + b.diceMaxDelta,
    specialistBonusDelta: a.specialistBonusDelta + b.specialistBonusDelta,
    handoffMultiplierDelta: a.handoffMultiplierDelta + b.handoffMultiplierDelta,
    collabMultiplierDelta: a.collabMultiplierDelta + b.collabMultiplierDelta,
    maxWipDelta: a.maxWipDelta + b.maxWipDelta,
    reworkChanceDelta: a.reworkChanceDelta + b.reworkChanceDelta,
  };
}

export function resolveMemberModifiers(member: Member): TraitEffects {
  let acc = { ...empty };
  if (member.traitQualityId && traitById[member.traitQualityId]) {
    acc = add(acc, traitById[member.traitQualityId].effects);
  }
  if (member.traitFlawId && traitById[member.traitFlawId]) {
    acc = add(acc, traitById[member.traitFlawId].effects);
  }
  return acc;
}
