import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { CfdRow } from '../simulation/metrics';
import type { CompletedCardTiming } from '../simulation/types';
import type { FinancialSummary } from '../simulation/financial';
import { CfdChart } from './CfdChart';
import { CycleTimeSummary } from './CycleTimeSummary';
import { FinancialReport } from './FinancialReport';
import { FinancialCharts } from './FinancialCharts';

type Props = {
  onClose: () => void;
  cfdData: CfdRow[];
  completed: CompletedCardTiming[];
  cardsById: Record<string, { title: string }>;
  financialSummary: FinancialSummary;
  lastGlobalDay: number;
};

export function PlayChartsModal({
  onClose,
  cfdData,
  completed,
  cardsById,
  financialSummary,
  lastGlobalDay,
}: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="play-charts-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel modal-panel--charts">
        <header className="modal-header">
          <h2 id="play-charts-title">{t('play.chartsModalTitle')}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('play.chartsModalClose')}>
            ×
          </button>
        </header>
        <div className="modal-body play-charts-modal-body">
          <section className="play-charts-modal-section">
            <CfdChart data={cfdData} />
          </section>
          <section className="play-charts-modal-section">
            <CycleTimeSummary completed={completed} cardsById={cardsById} />
          </section>
          <section className="play-charts-modal-section play-charts-modal-financial">
            <FinancialReport summary={financialSummary} />
            <FinancialCharts summary={financialSummary} lastGlobalDay={lastGlobalDay} />
          </section>
        </div>
      </div>
    </div>
  );
}
