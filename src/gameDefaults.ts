import type { AppLanguage } from './i18n/storage';
import type { Card, GameConfig, Member, SimulationParams } from './simulation/types';
import { ensureSynergyKeys, splitWork } from './simulation/engine';
import { STORY_WORK_MULTIPLIER } from './simulation/storyScale';
import { pairKey } from './simulation/synergy';
import ptBR from './locales/pt-BR.json';
import en from './locales/en.json';
import es from './locales/es.json';

type ScenarioCopy = {
  members: { ana: string; bruno: string; carla: string };
  cards: { api: string; checkout: string; report: string; dashboard: string };
};

type LocaleRoot = { scenario: ScenarioCopy };

const scenarioByLang: Record<AppLanguage, ScenarioCopy> = {
  'pt-BR': (ptBR as LocaleRoot).scenario,
  en: (en as LocaleRoot).scenario,
  es: (es as LocaleRoot).scenario,
};

export function defaultParams(): SimulationParams {
  return {
    daysPerSprint: 10,
    numSprints: 3,
    seed: 42,
    wipPerColumn: 3,
    /** 0 = não puxar cartões do backlog no planning; usa-se arrastar manualmente no quadro. */
    planningPullMax: 0,
    /** Só o jogador move o cartão para a coluna seguinte quando a etapa fica a zero. */
    autoAdvanceOnStageComplete: false,
    /** Ao fim de cada dia útil/planning, responsáveis são limpos para forçar realocação manual. */
    clearAssigneesAfterEachDay: true,
    synergyBeta: 0.35,
    synergyGamma: 0.25,
    collabEffMin: 0.55,
    collabEffMax: 1.35,
    handoffEffMin: 0.65,
    handoffEffMax: 1.25,
    handoffReworkSynergyThreshold: 0.15,
    reworkUnits: 2,
    dailyRandomEventChance: 0.22,
    financialLateFlatPenalty: 800,
    financialLatePerDayPenalty: 250,
    financialNotDeliveredMultiplier: 1,
  };
}

export function defaultMembers(lang: AppLanguage = 'pt-BR'): Member[] {
  const sc = scenarioByLang[lang] ?? scenarioByLang['pt-BR'];
  return [
    {
      id: 'm1',
      name: sc.members.ana,
      specialty: 'Analista',
    },
    {
      id: 'm2',
      name: sc.members.bruno,
      specialty: 'Desenvolvedor',
    },
    {
      id: 'm3',
      name: sc.members.carla,
      specialty: 'Testador',
    },
  ];
}

function cardWithStages(
  base: Omit<Card, 'workAnalise' | 'workDev' | 'workTeste' | 'points'> & { points: number },
): Card {
  const { wa, wd, wt } = splitWork(base.points);
  return {
    ...base,
    workAnalise: wa,
    workDev: wd,
    workTeste: wt,
    points: wa + wd + wt,
  };
}

export function defaultBacklog(lang: AppLanguage = 'pt-BR'): Card[] {
  const sc = scenarioByLang[lang] ?? scenarioByLang['pt-BR'];
  const k = STORY_WORK_MULTIPLIER;
  return [
    cardWithStages({
      id: 'c1',
      title: sc.cards.api,
      points: 8 * k,
      taskKind: 'backend',
      assigneeIds: [],
      businessValue: 14_000,
      dueGlobalDay: 72,
    }),
    cardWithStages({
      id: 'c2',
      title: sc.cards.checkout,
      points: 10 * k,
      taskKind: 'frontend',
      assigneeIds: [],
      businessValue: 22_000,
      dueGlobalDay: 88,
    }),
    cardWithStages({
      id: 'c3',
      title: sc.cards.report,
      points: 5 * k,
      taskKind: 'data',
      assigneeIds: [],
      businessValue: 9_000,
      dueGlobalDay: 96,
    }),
    cardWithStages({
      id: 'c4',
      title: sc.cards.dashboard,
      points: 12 * k,
      taskKind: 'design',
      assigneeIds: [],
      businessValue: 18_000,
      dueGlobalDay: 110,
    }),
  ];
}

export function defaultGameConfig(lang: AppLanguage = 'pt-BR'): GameConfig {
  const members = defaultMembers(lang);
  return {
    members,
    synergyByPair: ensureSynergyKeys(members, {
      [pairKey('m1', 'm2')]: 0.4,
      [pairKey('m1', 'm3')]: -0.2,
      [pairKey('m2', 'm3')]: 0.1,
    }),
    backlogCards: defaultBacklog(lang),
    params: defaultParams(),
  };
}

export const STORAGE_KEY = 'kanban-sinergia-game-v1';
