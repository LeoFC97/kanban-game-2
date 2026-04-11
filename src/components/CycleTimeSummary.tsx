import { useTranslation } from 'react-i18next';
import type { CompletedCardTiming } from '../simulation/types';

type Props = { completed: CompletedCardTiming[]; cardsById: Record<string, { title: string }> };

export function CycleTimeSummary({ completed, cardsById }: Props) {
  const { t } = useTranslation();
  if (completed.length === 0) {
    return <p className="muted">{t('cycleTime.empty')}</p>;
  }
  const vals = completed.map((c) => c.cycleTimeDays);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sorted = [...vals].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];

  return (
    <div className="cycle-block">
      <h4>{t('cycleTime.title')}</h4>
      <p>
        {t('cycleTime.mean')}: <strong>{mean.toFixed(1)}</strong> {t('cycleTime.days')} ·{' '}
        {t('cycleTime.median')}: <strong>{med}</strong> {t('cycleTime.days')}
      </p>
      <ul className="cycle-list">
        {completed.map((c) => (
          <li key={c.cardId}>
            {t('cycleTime.rowItem', {
              title: cardsById[c.cardId]?.title ?? c.cardId,
              days: c.cycleTimeDays,
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}
