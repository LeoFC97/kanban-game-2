import type { AppLanguage } from './i18n/storage';
import type { Card, GameConfig, Member, SimulationParams } from './simulation/types';
import { ensureSynergyKeys } from './simulation/engine';
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
    planningPullMax: 5,
    synergyBeta: 0.35,
    synergyGamma: 0.25,
    collabEffMin: 0.55,
    collabEffMax: 1.35,
    handoffEffMin: 0.65,
    handoffEffMax: 1.25,
    handoffReworkSynergyThreshold: 0.15,
    reworkUnits: 2,
    dailyRandomEventChance: 0.22,
  };
}

export function defaultMembers(lang: AppLanguage = 'pt-BR'): Member[] {
  const sc = scenarioByLang[lang] ?? scenarioByLang['pt-BR'];
  return [
    {
      id: 'm1',
      name: sc.members.ana,
      specialty: 'Analista',
      traitQualityId: 'comunicador',
      traitFlawId: 'hiperfoco',
    },
    {
      id: 'm2',
      name: sc.members.bruno,
      specialty: 'Desenvolvedor',
      traitQualityId: 'mentor',
      traitFlawId: 'evita_conflito',
    },
    {
      id: 'm3',
      name: sc.members.carla,
      specialty: 'Testador',
      traitQualityId: 'veterano',
      traitFlawId: 'silos',
    },
  ];
}

export function defaultBacklog(memberIds: string[], lang: AppLanguage = 'pt-BR'): Card[] {
  const sc = scenarioByLang[lang] ?? scenarioByLang['pt-BR'];
  const [, b, c] = memberIds;
  return [
    { id: 'c1', title: sc.cards.api, points: 8, collaborative: false, assigneeIds: [b] },
    {
      id: 'c2',
      title: sc.cards.checkout,
      points: 10,
      collaborative: true,
      assigneeIds: [b, c],
    },
    { id: 'c3', title: sc.cards.report, points: 5, collaborative: false, assigneeIds: [c] },
    { id: 'c4', title: sc.cards.dashboard, points: 12, collaborative: false, assigneeIds: [b] },
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
    backlogCards: defaultBacklog(members.map((m) => m.id), lang),
    params: defaultParams(),
  };
}

export const STORAGE_KEY = 'kanban-sinergia-game-v1';
