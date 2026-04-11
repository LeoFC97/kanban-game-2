import type { DailyRandomEventLog, LogNote, Member, SimulationParams } from './types';
import type { Rng } from './rng';
import { rollIntInclusive } from './rng';

export type DailyRandomEventId =
  | 'member_sick'
  | 'member_vacation'
  | 'member_half_day'
  | 'team_meeting'
  | 'infrastructure_outage'
  | 'good_vibes_break';

export interface DailyRandomEventDefinition {
  id: DailyRandomEventId;
  /** Peso no sorteio (só entra no sorteio se a probabilidade diária disparar). */
  weight: number;
}

/** Catálogo fixo: usado pelo motor e pela UI (lista de efeitos). */
export const DAILY_RANDOM_EVENT_CATALOG: DailyRandomEventDefinition[] = [
  { id: 'member_sick', weight: 18 },
  { id: 'member_vacation', weight: 14 },
  { id: 'member_half_day', weight: 16 },
  { id: 'team_meeting', weight: 14 },
  { id: 'infrastructure_outage', weight: 12 },
  { id: 'good_vibes_break', weight: 10 },
];

function addNote(
  notes: LogNote[],
  key: string,
  params?: Record<string, string | number>,
): void {
  notes.push(params ? { key, params } : { key });
}

function pickWeightedEvent(rng: Rng): DailyRandomEventId {
  const total = DAILY_RANDOM_EVENT_CATALOG.reduce((s, e) => s + e.weight, 0);
  let r = rng.next() * total;
  for (const e of DAILY_RANDOM_EVENT_CATALOG) {
    r -= e.weight;
    if (r <= 0) return e.id;
  }
  return DAILY_RANDOM_EVENT_CATALOG[DAILY_RANDOM_EVENT_CATALOG.length - 1]!.id;
}

function pickMember(members: Member[], rng: Rng): Member {
  return members[rollIntInclusive(rng, 0, members.length - 1)]!;
}

/**
 * Sorteia evento(s) do dia útil. Quando não dispara, devolve mults vazias e lista vazia.
 * `capacityMultByMemberId` omite chaves com multiplicador 1 (ou inclui todas as chaves com 1 — aqui só as != 1 para economizar).
 */
export function rollDailyRandomEvents(
  members: Member[],
  params: SimulationParams,
  rng: Rng,
  notes: LogNote[],
): { capacityMultByMemberId: Record<string, number>; events: DailyRandomEventLog[] } {
  const chance = params.dailyRandomEventChance ?? 0;
  const outMult: Record<string, number> = {};
  const events: DailyRandomEventLog[] = [];

  if (chance <= 0 || members.length === 0) {
    return { capacityMultByMemberId: outMult, events };
  }
  if (rng.next() >= chance) {
    return { capacityMultByMemberId: outMult, events };
  }

  const id = pickWeightedEvent(rng);
  const setAll = (v: number) => {
    for (const m of members) outMult[m.id] = v;
  };

  switch (id) {
    case 'member_sick': {
      const m = pickMember(members, rng);
      outMult[m.id] = 0;
      events.push({ eventId: id, affectedMemberIds: [m.id] });
      addNote(notes, 'engine.dailyEventMemberSick', { memberName: m.name });
      break;
    }
    case 'member_vacation': {
      const m = pickMember(members, rng);
      outMult[m.id] = 0;
      events.push({ eventId: id, affectedMemberIds: [m.id] });
      addNote(notes, 'engine.dailyEventMemberVacation', { memberName: m.name });
      break;
    }
    case 'member_half_day': {
      const m = pickMember(members, rng);
      outMult[m.id] = 0.5;
      events.push({ eventId: id, affectedMemberIds: [m.id] });
      addNote(notes, 'engine.dailyEventMemberHalfDay', { memberName: m.name });
      break;
    }
    case 'team_meeting': {
      setAll(0.65);
      events.push({ eventId: id });
      addNote(notes, 'engine.dailyEventTeamMeeting');
      break;
    }
    case 'infrastructure_outage': {
      setAll(0.78);
      events.push({ eventId: id });
      addNote(notes, 'engine.dailyEventOutage');
      break;
    }
    case 'good_vibes_break': {
      setAll(1.12);
      events.push({ eventId: id });
      addNote(notes, 'engine.dailyEventGoodVibes');
      break;
    }
    default:
      break;
  }

  return { capacityMultByMemberId: outMult, events };
}
