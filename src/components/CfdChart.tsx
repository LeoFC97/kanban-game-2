import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import type { CfdRow } from '../simulation/metrics';
import { COLUMN_ORDER, type ColumnId } from '../simulation/types';

type Props = { data: CfdRow[] };

const CFD_COLS: ColumnId[] = [...COLUMN_ORDER];

export function CfdChart({ data }: Props) {
  const { t } = useTranslation();
  if (data.length === 0) return <p className="muted">{t('cfd.empty')}</p>;

  const strokes: Record<ColumnId, string> = {
    backlog: '#64748b',
    analise: '#a855f7',
    dev: '#22c55e',
    teste: '#eab308',
    deploy: '#f97316',
  };
  const fills: Record<ColumnId, string> = {
    backlog: '#94a3b8',
    analise: '#c084fc',
    dev: '#4ade80',
    teste: '#facc15',
    deploy: '#fb923c',
  };

  return (
    <div className="chart-wrap">
      <h4>{t('cfd.title')}</h4>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="globalDay" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {CFD_COLS.map((col) => (
            <Area
              key={col}
              type="monotone"
              dataKey={col}
              stackId="1"
              stroke={strokes[col]}
              fill={fills[col]}
              name={t(`columns.${col}`)}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
