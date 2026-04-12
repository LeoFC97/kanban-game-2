import type { SimulationParams } from '../simulation/types';

function randomInt(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export function randomCardFinancialFields(params: SimulationParams): {
  dueGlobalDay?: number;
  businessValue?: number;
} {
  const horizon = params.numSprints * params.daysPerSprint;
  const maxDue = Math.max(60, Math.round(horizon * 2.2 + 24));
  const duePickLo = Math.max(6, Math.min(Math.round(horizon * 0.55), maxDue));
  const dueGlobalDay = Math.random() < 0.1 ? undefined : randomInt(duePickLo, maxDue);
  const businessValue = Math.random() < 0.12 ? undefined : randomInt(8, 90) * 500;
  return { dueGlobalDay, businessValue };
}
