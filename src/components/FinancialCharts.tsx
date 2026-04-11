import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FinancialSummary } from '../simulation/financial';
import {
  buildFinancialCumulativeSeries,
  buildFinancialPerCardChart,
  buildFinancialStatusPie,
} from '../simulation/financial';
import { formatMoney } from '../formatMoney';

type Props = {
  summary: FinancialSummary;
  lastGlobalDay: number;
};

type ChartKind = 'perCard' | 'cumulative' | 'statusPie';

const STATUS_COLORS: Record<string, string> = {
  on_time: '#22c55e',
  late: '#eab308',
  not_done: '#ef4444',
};

const BAR_NET_COLORS: Record<string, string> = {
  on_time: '#4ade80',
  late: '#facc15',
  not_done: '#f87171',
};

export function FinancialCharts({ summary, lastGlobalDay }: Props) {
  const { t, i18n } = useTranslation();
  const currency = t('financial.currencyCode');
  const fmt = (n: number) => formatMoney(n, i18n.language, currency);
  const [kind, setKind] = useState<ChartKind>('perCard');

  const perCard = useMemo(() => buildFinancialPerCardChart(summary), [summary]);
  const cumulative = useMemo(
    () => buildFinancialCumulativeSeries(summary, lastGlobalDay),
    [summary, lastGlobalDay],
  );
  const pieData = useMemo(() => {
    const raw = buildFinancialStatusPie(summary);
    return raw.map((x) => ({
      name: t(`financial.status.${x.key}`),
      key: x.key,
      value: x.value,
    }));
  }, [summary, t]);

  if (summary.rows.every((r) => r.businessValue <= 0 && r.netContribution === 0)) {
    return null;
  }

  return (
    <div className="panel financial-charts-panel">
      <div className="financial-chart-toolbar">
        <h2>{t('financial.chartsTitle')}</h2>
        <select
          className="input financial-chart-select"
          value={kind}
          onChange={(e) => setKind(e.target.value as ChartKind)}
          aria-label={t('financial.chartKindLabel')}
        >
          <option value="perCard">{t('financial.chartKind.perCard')}</option>
          <option value="cumulative">{t('financial.chartKind.cumulative')}</option>
          <option value="statusPie">{t('financial.chartKind.statusPie')}</option>
        </select>
      </div>

      {kind === 'perCard' && perCard.length > 0 && (
        <div className="chart-wrap">
          <p className="muted small financial-chart-hint">{t('financial.chartHint.perCard')}</p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={perCard} margin={{ top: 8, right: 8, left: 8, bottom: 64 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="title" interval={0} angle={-28} textAnchor="end" tick={{ fontSize: 10 }} height={70} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => String(Math.round(v / 1000)) + 'k'} />
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Legend />
              <Bar dataKey="value" name={t('financial.seriesTarget')} fill="#64748b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net" name={t('financial.seriesNet')} radius={[4, 4, 0, 0]}>
                {perCard.map((e, i) => (
                  <Cell key={i} fill={BAR_NET_COLORS[e.status] ?? '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {kind === 'cumulative' && cumulative.length > 0 && (
        <div className="chart-wrap">
          <p className="muted small financial-chart-hint">{t('financial.chartHint.cumulative')}</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cumulative} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="globalDay" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => String(Math.round(v / 1000)) + 'k'} />
              <Tooltip
                formatter={(v) => fmt(Number(v))}
                labelFormatter={(d) => t('financial.tooltipDay', { day: d })}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="cumulativeNet"
                name={t('financial.seriesCumulative')}
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {kind === 'statusPie' && pieData.length > 0 && (
        <div className="chart-wrap">
          <p className="muted small financial-chart-hint">{t('financial.chartHint.statusPie')}</p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {pieData.map((e, i) => (
                  <Cell key={i} fill={STATUS_COLORS[e.key] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {kind === 'statusPie' && pieData.length === 0 && (
        <p className="muted">{t('financial.pieEmpty')}</p>
      )}
    </div>
  );
}
