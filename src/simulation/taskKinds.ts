import type { GameConfig, Specialty, TaskKind } from './types';

export const TASK_KINDS: TaskKind[] = [
  'backend',
  'frontend',
  'infrastructure',
  'design',
  'data',
];

/** Especialista de quadro por defeito para cada tipo de tarefa (configurável no setup). */
export const DEFAULT_SPECIALTY_BY_TASK_KIND: Record<TaskKind, Specialty> = {
  backend: 'Desenvolvedor',
  frontend: 'Desenvolvedor',
  infrastructure: 'Desenvolvedor',
  design: 'Analista',
  data: 'Analista',
};

export function mergeSpecialtyByTaskKind(config: Pick<GameConfig, 'specialtyByTaskKind'>): Record<
  TaskKind,
  Specialty
> {
  return { ...DEFAULT_SPECIALTY_BY_TASK_KIND, ...(config.specialtyByTaskKind ?? {}) };
}
