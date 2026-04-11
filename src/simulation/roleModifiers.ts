import type { Member, Specialty } from './types';
import { jobRoleById, SPECIALTIES_ORDER } from './rolesCatalog';

const MAX_STACKED_GLOBAL_CAP_BONUS = 0.75;
const MAX_STACKED_HANDOFF_REWORK_REDUCTION = 0.35;

/** Soma das reduções de probabilidade de retrabalho em handoffs vindas dos papéis (ex.: Scrum Master). */
export function aggregateGlobalHandoffReworkChanceReduction(members: Member[]): number {
  let s = 0;
  for (const m of members) {
    if (!m.jobRoleId) continue;
    const role = jobRoleById[m.jobRoleId];
    const r = role?.effects.globalHandoffReworkChanceReduction;
    if (r !== undefined && r > 0) s += r;
  }
  return Math.min(s, MAX_STACKED_HANDOFF_REWORK_REDUCTION);
}

/** Soma dos bónus de capacidade por `specialty` vindos dos `jobRoleId` de todos os membros. */
export function aggregateGlobalCapacityBonusBySpecialty(members: Member[]): Record<Specialty, number> {
  const out: Record<Specialty, number> = {
    Analista: 0,
    Desenvolvedor: 0,
    Testador: 0,
  };
  for (const m of members) {
    if (!m.jobRoleId) continue;
    const role = jobRoleById[m.jobRoleId];
    if (!role) continue;
    const b = role.effects.globalCapacityMultBonusForSpecialty;
    if (!b) continue;
    for (const sp of SPECIALTIES_ORDER) {
      const v = b[sp];
      if (v !== undefined && v > 0) out[sp] += v;
    }
  }
  for (const sp of SPECIALTIES_ORDER) {
    out[sp] = Math.min(out[sp], MAX_STACKED_GLOBAL_CAP_BONUS);
  }
  return out;
}
