import type { Card, CompletedCardTiming, SimulationParams } from './types';

export type FinancialCardStatus = 'on_time' | 'late' | 'not_done';

export interface CardFinancialResult {
  cardId: string;
  title: string;
  businessValue: number;
  dueGlobalDay: number | null;
  deployedGlobalDay: number | null;
  status: FinancialCardStatus;
  daysLate: number;
  penalty: number;
  netContribution: number;
}

export interface FinancialSummary {
  rows: CardFinancialResult[];
  /** Soma dos `businessValue` dos cartões com valor > 0. */
  totalPotential: number;
  /** Soma dos `netContribution` (pode ser negativa). */
  totalNet: number;
  onTimeCount: number;
  lateCount: number;
  notDoneCount: number;
}

export interface FinancialCumulativePoint {
  globalDay: number;
  cumulativeNet: number;
  /** Contribuição líquida reconhecida neste dia (deploys +, no último dia, penalidades de não entregues). */
  deltaDay: number;
}

function latePenaltyTotal(daysLate: number, params: SimulationParams): number {
  const flat = params.financialLateFlatPenalty ?? 800;
  const perDay = params.financialLatePerDayPenalty ?? 250;
  return flat + daysLate * perDay;
}

/**
 * Relatório financeiro por cartão do backlog: valor de negócio, prazo (`dueGlobalDay` inclusivo)
 * e penalidades se deploy > prazo ou se nunca chegou a Deploy.
 */
export function buildFinancialSummary(
  backlogCards: Card[],
  completed: CompletedCardTiming[],
  params: SimulationParams,
): FinancialSummary {
  const completedById = new Map(completed.map((c) => [c.cardId, c]));
  const notDeliveredMult = params.financialNotDeliveredMultiplier ?? 1;

  const rows: CardFinancialResult[] = backlogCards.map((card) => {
    const bv = Math.max(0, Number(card.businessValue) || 0);
    const dueRaw = card.dueGlobalDay;
    const due =
      dueRaw != null && Number.isFinite(Number(dueRaw))
        ? Math.max(1, Math.round(Number(dueRaw)))
        : null;
    const timing = completedById.get(card.id);

    if (!timing) {
      const penalty = bv > 0 ? bv * notDeliveredMult : 0;
      return {
        cardId: card.id,
        title: card.title,
        businessValue: bv,
        dueGlobalDay: due,
        deployedGlobalDay: null,
        status: 'not_done',
        daysLate: 0,
        penalty,
        netContribution: -penalty,
      };
    }

    const D = timing.deployedGlobalDay;

    if (bv === 0) {
      return {
        cardId: card.id,
        title: card.title,
        businessValue: 0,
        dueGlobalDay: due,
        deployedGlobalDay: D,
        status: 'on_time',
        daysLate: 0,
        penalty: 0,
        netContribution: 0,
      };
    }

    if (due == null || D <= due) {
      return {
        cardId: card.id,
        title: card.title,
        businessValue: bv,
        dueGlobalDay: due,
        deployedGlobalDay: D,
        status: 'on_time',
        daysLate: 0,
        penalty: 0,
        netContribution: bv,
      };
    }

    const daysLate = D - due;
    const pen = latePenaltyTotal(daysLate, params);
    return {
      cardId: card.id,
      title: card.title,
      businessValue: bv,
      dueGlobalDay: due,
      deployedGlobalDay: D,
      status: 'late',
      daysLate,
      penalty: pen,
      netContribution: bv - pen,
    };
  });

  const withValue = rows.filter((r) => r.businessValue > 0);
  const totalPotential = withValue.reduce((s, r) => s + r.businessValue, 0);
  const totalNet = rows.reduce((s, r) => s + r.netContribution, 0);

  const onTimeCount = rows.filter((r) => r.businessValue > 0 && r.status === 'on_time').length;
  const lateCount = rows.filter((r) => r.businessValue > 0 && r.status === 'late').length;
  const notDoneCount = rows.filter((r) => r.businessValue > 0 && r.status === 'not_done').length;

  return {
    rows,
    totalPotential,
    totalNet,
    onTimeCount,
    lateCount,
    notDoneCount,
  };
}

/**
 * Série de resultado líquido acumulado por dia global: em cada dia soma-se o `netContribution`
 * dos cartões que fizeram deploy nesse dia; no último dia inclui-se o impacto dos não entregues.
 */
export function buildFinancialCumulativeSeries(
  summary: FinancialSummary,
  lastGlobalDay: number,
): FinancialCumulativePoint[] {
  const byDay = new Map<number, number>();
  for (const r of summary.rows) {
    if (r.status === 'not_done') continue;
    if (r.deployedGlobalDay == null) continue;
    const d = r.deployedGlobalDay;
    byDay.set(d, (byDay.get(d) ?? 0) + r.netContribution);
  }
  const notDoneNet = summary.rows
    .filter((r) => r.status === 'not_done')
    .reduce((s, r) => s + r.netContribution, 0);

  const maxDeploy = byDay.size ? Math.max(...byDay.keys()) : 0;
  const maxD = Math.max(1, lastGlobalDay, maxDeploy);

  const out: FinancialCumulativePoint[] = [];
  let cum = 0;
  for (let d = 1; d <= maxD; d++) {
    let delta = byDay.get(d) ?? 0;
    if (d === maxD && notDoneNet !== 0) delta += notDoneNet;
    cum += delta;
    out.push({ globalDay: d, cumulativeNet: cum, deltaDay: delta });
  }
  return out;
}

/** Dados para gráfico de barras por cartão (valor alvo vs líquido). */
export function buildFinancialPerCardChart(summary: FinancialSummary) {
  return summary.rows
    .filter((r) => r.businessValue > 0 || r.netContribution !== 0)
    .map((r) => ({
      id: r.cardId,
      title: r.title.length > 22 ? `${r.title.slice(0, 20)}…` : r.title,
      value: r.businessValue,
      net: r.netContribution,
      status: r.status,
    }));
}

/** Contagens por estado (só cartões com valor de negócio). */
export function buildFinancialStatusPie(summary: FinancialSummary) {
  return [
    { key: 'on_time', value: summary.onTimeCount },
    { key: 'late', value: summary.lateCount },
    { key: 'not_done', value: summary.notDoneCount },
  ].filter((x) => x.value > 0);
}
