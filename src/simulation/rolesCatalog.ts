import type { JobRoleDefinition, Specialty } from './types';

/** Papéis transversais (além do cargo no quadro: Analista / Dev / Testador). */
export const JOB_ROLES: JobRoleDefinition[] = [
  {
    id: 'tech_lead',
    effects: {
      globalCapacityMultBonusForSpecialty: { Desenvolvedor: 0.15 },
    },
  },
  {
    id: 'scrum_master',
    effects: {
      globalHandoffReworkChanceReduction: 0.06,
    },
  },
];

export const jobRoleById: Record<string, JobRoleDefinition> = Object.fromEntries(
  JOB_ROLES.map((r) => [r.id, r]),
);

export function isKnownJobRoleId(id: string): boolean {
  return id in jobRoleById;
}

export const SPECIALTIES_ORDER: Specialty[] = ['Analista', 'Desenvolvedor', 'Testador'];
