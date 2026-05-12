import type { BoardCard, BoardState, ColumnId, Member, SimulationParams, SynergyRuntime } from './types';
import { clamp, resolveSynergy } from './synergy';
import {
  EFFECTIVE_DAILY_CAPACITY_MAX,
  normalizedDeliveryRange,
  resolveMemberFromToken,
} from './engine';
import { aggregateGlobalCapacityBonusBySpecialty } from './roleModifiers';
import { resolveMemberModifiers } from './memberModifiers';

export { resolveMemberFromToken };

function specialtyColumn(m: Member): ColumnId {
  if (m.specialty === 'Analista') return 'analise';
  if (m.specialty === 'Desenvolvedor') return 'dev';
  return 'teste';
}

function hasWorkInColumn(board: BoardState, col: ColumnId): boolean {
  return board.columns[col].some((cid) => {
    const c = board.cardsById[cid];
    return !!c && c.remainingInStage > 0;
  });
}

function clampRoundDailyCapacity(n: number): number {
  return Math.max(0, Math.min(EFFECTIVE_DAILY_CAPACITY_MAX, Math.round(n)));
}

function collabMultiplierForCard(
  card: BoardCard,
  members: Member[],
  synergy: SynergyRuntime,
  params: SimulationParams,
): { mult: number; avgSynergy: number | null } {
  if (card.assigneeIds.length < 2) return { mult: 1, avgSynergy: null };
  const assignees = card.assigneeIds
    .map((id) => resolveMemberFromToken(members, id))
    .filter((m): m is Member => !!m);
  if (assignees.length < 2) return { mult: 1, avgSynergy: null };
  let sum = 0;
  let n = 0;
  for (let i = 0; i < assignees.length; i++) {
    for (let j = i + 1; j < assignees.length; j++) {
      sum += resolveSynergy(members, synergy.synergyByPair, assignees[i]!.id, assignees[j]!.id, {
        synergyPairBidirectional: synergy.synergyPairBidirectional,
        synergyDirected: synergy.synergyDirected,
        mode: 'collaboration',
      });
      n++;
    }
  }
  const avg = n > 0 ? sum / n : 0;
  const traitDeltaMean =
    assignees.reduce((s, m) => s + resolveMemberModifiers(m).collabMultiplierDelta, 0) / assignees.length;
  return {
    mult: clamp(1 + params.synergyBeta * avg + traitDeltaMean, params.collabEffMin, params.collabEffMax),
    avgSynergy: avg,
  };
}

export type AssigneeDailyEstimate = {
  memberName: string;
  memberId: string;
  baseMin: number;
  baseMax: number;
  specialistMult: number;
  specialistApplied: boolean;
  roleMult: number;
  eventMultMin: number;
  eventMultMax: number;
  collabMult: number;
  avgSynergy: number | null;
  minPointsOnCard: number;
  maxPointsOnCard: number;
  cardRemainingCap: number;
  specialtyCol: ColumnId;
};

export function estimateAssigneeDailyRangeOnCard(args: {
  card: BoardCard;
  columnId: ColumnId;
  assigneeToken: string;
  members: Member[];
  board: BoardState;
  params: SimulationParams;
  synergy: SynergyRuntime;
}): AssigneeDailyEstimate | null {
  const m = resolveMemberFromToken(args.members, args.assigneeToken);
  if (!m) return null;
  const { lo: baseMin, hi: baseMax } = normalizedDeliveryRange(m);
  const sc = specialtyColumn(m);
  const specApplied = hasWorkInColumn(args.board, sc);
  const specialistMult = specApplied
    ? clamp(2 + resolveMemberModifiers(m).specialistBonusDelta, 1.25, 3.5)
    : 1;
  const roleBonus = aggregateGlobalCapacityBonusBySpecialty(args.members)[m.specialty] ?? 0;
  const roleMult = roleBonus > 0 ? 1 + roleBonus : 1;
  // #27: envelope worst-case do multiplicador do evento aleatório do dia.
  // Os eventos do catálogo (dailyRandomEvents.ts) usam {0, 0.5, 0.65, 0.78, 1.0, 1.12};
  // representamos o intervalo como [0, 1.12] em vez de discretizar todos, porque a tooltip
  // existe para mostrar o cenário pessimista/otimista, não a distribuição completa.
  // #34: o min=0 reflete que, com chance>0, sempre existe possibilidade não-nula de
  // o membro ser sorteado para sick/vacation e zerar a capacidade no dia.
  const eventRange =
    (args.params.dailyRandomEventChance ?? 0) > 0 ? { min: 0, max: 1.12 } : { min: 1, max: 1 };
  const capMin = clampRoundDailyCapacity(baseMin * specialistMult * roleMult * eventRange.min);
  const capMax = clampRoundDailyCapacity(baseMax * specialistMult * roleMult * eventRange.max);
  const collab =
    args.columnId === 'dev'
      ? collabMultiplierForCard(args.card, args.members, args.synergy, args.params)
      : { mult: 1, avgSynergy: null };
  return {
    memberName: m.name,
    memberId: m.id,
    baseMin,
    baseMax,
    specialistMult,
    specialistApplied: specApplied,
    roleMult,
    eventMultMin: eventRange.min,
    eventMultMax: eventRange.max,
    collabMult: collab.mult,
    avgSynergy: collab.avgSynergy,
    minPointsOnCard: capMin * collab.mult,
    maxPointsOnCard: capMax * collab.mult,
    cardRemainingCap: Math.max(0, args.card.remainingInStage),
    specialtyCol: sc,
  };
}
