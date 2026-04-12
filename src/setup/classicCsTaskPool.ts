import type { Card, SimulationParams, TaskKind } from '../simulation/types';
import { STORY_WORK_MULTIPLIER } from '../simulation/storyScale';
import { randomCardFinancialFields } from './randomBacklogCard';

function randomInt(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/** Distribuição de esforço por etapa alinhada ao “formato” da tarefa clássica. */
export type ClassicWorkProfile =
  | 'balanced'
  | 'analysisHeavy'
  | 'devHeavy'
  | 'testHeavy'
  | 'algoCore';

export interface ClassicCsTemplate {
  /** Chave i18n: `setup.classicTasks.<key>` */
  key: string;
  taskKind: TaskKind;
  profile: ClassicWorkProfile;
}

function stageUnitsForProfile(profile: ClassicWorkProfile): { wa: number; wd: number; wt: number } {
  const m = STORY_WORK_MULTIPLIER;
  const j = 2 + Math.floor(m / 4);
  const jitter = (a0: number, d0: number, t0: number) => ({
    wa: Math.max(1, a0 + randomInt(-j, j)),
    wd: Math.max(1, d0 + randomInt(-j, j)),
    wt: Math.max(1, t0 + randomInt(-j, j)),
  });
  switch (profile) {
    case 'balanced':
      return jitter(3 * m, 4 * m, 3 * m);
    case 'analysisHeavy':
      return jitter(6 * m, 3 * m, 2 * m);
    case 'devHeavy':
      return jitter(2 * m, 7 * m, 3 * m);
    case 'testHeavy':
      return jitter(2 * m, 3 * m, 6 * m);
    case 'algoCore':
      return jitter(3 * m, 6 * m, 4 * m);
    default:
      return jitter(3 * m, 4 * m, 3 * m);
  }
}

/**
 * Modelos pré-definidos inspirados em tópicos clássicos de computação (algoritmos, SO, redes, eng. software).
 * Títulos vêm de i18n; `taskKind` e `profile` guiam o motor e a repartição Análise/Dev/Testes.
 */
export const CLASSIC_CS_TASKS: ClassicCsTemplate[] = [
  { key: 'dijkstra', taskKind: 'backend', profile: 'algoCore' },
  { key: 'bfsDfs', taskKind: 'backend', profile: 'algoCore' },
  { key: 'binarySearchTree', taskKind: 'backend', profile: 'devHeavy' },
  { key: 'hashChaining', taskKind: 'backend', profile: 'algoCore' },
  { key: 'lruCache', taskKind: 'backend', profile: 'devHeavy' },
  { key: 'mergeSort', taskKind: 'backend', profile: 'algoCore' },
  { key: 'quickSort', taskKind: 'backend', profile: 'algoCore' },
  { key: 'heapPriorityQueue', taskKind: 'backend', profile: 'algoCore' },
  { key: 'trieAutocomplete', taskKind: 'backend', profile: 'devHeavy' },
  { key: 'unionFind', taskKind: 'backend', profile: 'algoCore' },
  { key: 'topologicalSort', taskKind: 'backend', profile: 'algoCore' },
  { key: 'bloomFilter', taskKind: 'data', profile: 'balanced' },
  { key: 'merkleTree', taskKind: 'backend', profile: 'algoCore' },
  { key: 'levenshteinDp', taskKind: 'backend', profile: 'algoCore' },
  { key: 'knapsackDp', taskKind: 'backend', profile: 'algoCore' },
  { key: 'mstPrimKruskal', taskKind: 'backend', profile: 'algoCore' },
  { key: 'regexNfa', taskKind: 'backend', profile: 'devHeavy' },
  { key: 'consistentHash', taskKind: 'infrastructure', profile: 'devHeavy' },
  { key: 'rateLimiter', taskKind: 'backend', profile: 'balanced' },
  { key: 'deadlockDetect', taskKind: 'data', profile: 'analysisHeavy' },
  { key: 'pageReplacement', taskKind: 'infrastructure', profile: 'devHeavy' },
  { key: 'threadPool', taskKind: 'backend', profile: 'devHeavy' },
  { key: 'lexerMini', taskKind: 'backend', profile: 'devHeavy' },
  { key: 'rdParser', taskKind: 'backend', profile: 'devHeavy' },
  { key: 'sqlPlannerBasics', taskKind: 'data', profile: 'analysisHeavy' },
  { key: 'restPagination', taskKind: 'backend', profile: 'balanced' },
  { key: 'oauth2Flow', taskKind: 'backend', profile: 'analysisHeavy' },
  { key: 'websocketReconnect', taskKind: 'backend', profile: 'balanced' },
  { key: 'testHarness', taskKind: 'backend', profile: 'testHeavy' },
  { key: 'propertyTests', taskKind: 'backend', profile: 'testHeavy' },
  { key: 'ciMonorepo', taskKind: 'infrastructure', profile: 'devHeavy' },
  { key: 'dockerCompose', taskKind: 'infrastructure', profile: 'balanced' },
  { key: 'lbHealthchecks', taskKind: 'infrastructure', profile: 'testHeavy' },
  { key: 'reactFormRefactor', taskKind: 'frontend', profile: 'devHeavy' },
  { key: 'a11yDashboard', taskKind: 'frontend', profile: 'testHeavy' },
  { key: 'orderFsm', taskKind: 'frontend', profile: 'balanced' },
  { key: 'designTokensStorybook', taskKind: 'design', profile: 'analysisHeavy' },
  { key: 'capAdr', taskKind: 'design', profile: 'analysisHeavy' },
  { key: 'etlIdempotent', taskKind: 'data', profile: 'devHeavy' },
];

export function pickRandomClassicTemplate(): ClassicCsTemplate {
  return CLASSIC_CS_TASKS[randomInt(0, CLASSIC_CS_TASKS.length - 1)]!;
}

export function buildClassicBacklogCard(args: {
  id: string;
  title: string;
  params: SimulationParams;
  template: ClassicCsTemplate;
}): Card {
  const { wa, wd, wt } = stageUnitsForProfile(args.template.profile);
  const { dueGlobalDay, businessValue } = randomCardFinancialFields(args.params);

  const card: Card = {
    id: args.id,
    title: args.title,
    points: wa + wd + wt,
    workAnalise: wa,
    workDev: wd,
    workTeste: wt,
    taskKind: args.template.taskKind,
    assigneeIds: [],
  };
  if (dueGlobalDay !== undefined) card.dueGlobalDay = dueGlobalDay;
  if (businessValue !== undefined) card.businessValue = businessValue;
  return card;
}
