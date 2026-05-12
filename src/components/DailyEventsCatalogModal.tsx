import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DailyEventsCatalog } from './DailyEventsCatalog';

type Props = {
  onClose: () => void;
};

export function DailyEventsCatalogModal({ onClose }: Props) {
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
      aria-labelledby="daily-events-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel modal-panel--daily-events">
        <header className="modal-header">
          <h2 id="daily-events-modal-title">{t('dailyEvents.catalogTitle')}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t('play.dailyEventsModalClose')}
          >
            ×
          </button>
        </header>
        <div className="modal-body daily-events-modal-body">
          <DailyEventsCatalog embedded showHeading={false} />
        </div>
      </div>
    </div>
  );
}
