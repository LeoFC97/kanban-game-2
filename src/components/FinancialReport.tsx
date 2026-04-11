import { useTranslation } from 'react-i18next';
import type { FinancialSummary } from '../simulation/financial';
import { formatMoney } from '../formatMoney';

type Props = {
  summary: FinancialSummary;
};

export function FinancialReport({ summary }: Props) {
  const { t, i18n } = useTranslation();
  const currency = t('financial.currencyCode');
  const fmt = (n: number) => formatMoney(n, i18n.language, currency);

  if (summary.rows.every((r) => r.businessValue <= 0 && r.netContribution === 0)) {
    return (
      <div className="panel financial-panel">
        <h2>{t('financial.title')}</h2>
        <p className="muted">{t('financial.emptyHint')}</p>
      </div>
    );
  }

  return (
    <div className="panel financial-panel">
      <h2>{t('financial.title')}</h2>
      <div className="financial-totals">
        <div className="financial-total-card">
          <span className="financial-total-label">{t('financial.totalPotential')}</span>
          <strong className="financial-total-value">{fmt(summary.totalPotential)}</strong>
        </div>
        <div className="financial-total-card accent">
          <span className="financial-total-label">{t('financial.totalNet')}</span>
          <strong
            className={`financial-total-value ${summary.totalNet < 0 ? 'negative' : ''}`}
          >
            {fmt(summary.totalNet)}
          </strong>
        </div>
        <div className="financial-total-card muted-block">
          <span className="financial-total-label">{t('financial.countsLine')}</span>
          <span className="financial-counts">
            {t('financial.countOnTime', { n: summary.onTimeCount })} ·{' '}
            {t('financial.countLate', { n: summary.lateCount })} ·{' '}
            {t('financial.countNotDone', { n: summary.notDoneCount })}
          </span>
        </div>
      </div>

      <div className="table-scroll">
        <table className="data-table financial-table">
          <thead>
            <tr>
              <th>{t('financial.colTitle')}</th>
              <th>{t('financial.colValue')}</th>
              <th>{t('financial.colDue')}</th>
              <th>{t('financial.colDeployed')}</th>
              <th>{t('financial.colStatus')}</th>
              <th>{t('financial.colPenalty')}</th>
              <th>{t('financial.colNet')}</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((r) => (
              <tr key={r.cardId}>
                <td>{r.title}</td>
                <td>{r.businessValue > 0 ? fmt(r.businessValue) : '—'}</td>
                <td>{r.dueGlobalDay != null ? r.dueGlobalDay : '—'}</td>
                <td>{r.deployedGlobalDay != null ? r.deployedGlobalDay : '—'}</td>
                <td>
                  <span className={`fin-status fin-status-${r.status}`}>
                    {t(`financial.status.${r.status}`)}
                  </span>
                </td>
                <td>{r.penalty > 0 ? fmt(r.penalty) : '—'}</td>
                <td className={r.netContribution < 0 ? 'negative' : ''}>{fmt(r.netContribution)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
