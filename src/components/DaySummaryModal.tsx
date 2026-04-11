import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { DayLog, Member } from '../simulation/types';
import { formatLogNote } from '../i18n/formatLogNote';

type Props = {
  log: DayLog;
  members: Member[];
  onClose: () => void;
};

export function DaySummaryModal({ log, members, onClose }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const memberById = (id: string) => members.find((m) => m.id === id);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-summary-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel">
        <header className="modal-header">
          <h2 id="day-summary-title">{t('play.dayModal.title')}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('play.dayModal.close')}>
            ×
          </button>
        </header>

        <div className="modal-body">
          <div className="day-modal-meta">
            <span className="badge">{t('play.globalDay', { day: log.globalDay })}</span>
            <span className="badge sprint">{t('play.sprintBadge', { n: log.sprint })}</span>
            <span className="badge day">{t('play.dayBadge', { n: log.dayInSprint })}</span>
            <strong className="day-modal-ceremony">{t(`ceremonies.${log.ceremony}`)}</strong>
          </div>

          {log.dailyRandomEvents && log.dailyRandomEvents.length > 0 && (
            <section className="day-modal-section">
              <h3>{t('play.dayModal.randomEvents')}</h3>
              <ul className="day-modal-list">
                {log.dailyRandomEvents.map((ev, i) => (
                  <li key={i}>
                    <strong>{t(`dailyEvents.${ev.eventId}.name`)}</strong>
                    {' — '}
                    <span className="muted">{t(`dailyEvents.${ev.eventId}.effect`)}</span>
                    {ev.affectedMemberIds && ev.affectedMemberIds.length > 0 && (
                      <span className="day-modal-affected">
                        {' '}
                        (
                        {ev.affectedMemberIds
                          .map((id) => memberById(id)?.name ?? id)
                          .join(', ')}
                        )
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(log.ceremony === 'daily_scrum' || log.ceremony === 'sprint_review') &&
            members.length > 0 && (
              <section className="day-modal-section">
                <h3>{t('play.dayModal.capacityTitle')}</h3>
                <table className="day-modal-table">
                  <thead>
                    <tr>
                      <th>{t('play.dayModal.colMember')}</th>
                      <th>{t('play.dayModal.colRoll')}</th>
                      <th>{t('play.dayModal.colEffective')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id}>
                        <td>{m.name}</td>
                        <td>{log.diceByMemberId[m.id] ?? '—'}</td>
                        <td>{log.effectiveCapacityByMemberId[m.id] ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

          <section className="day-modal-section">
            <h3>{t('play.dayModal.boardTitle')}</h3>
            <ul className="day-modal-columns">
              {(
                [
                  'backlog',
                  'ready',
                  'analise',
                  'dev',
                  'teste',
                  'deploy',
                ] as const
              ).map((col) => (
                <li key={col}>
                  <span className="muted">{t(`columns.${col}`)}</span>
                  <strong>{log.columnCounts[col]}</strong>
                </li>
              ))}
            </ul>
          </section>

          {log.notes.length > 0 && (
            <section className="day-modal-section">
              <h3>{t('play.dayModal.logTitle')}</h3>
              <ul className="day-modal-list">
                {log.notes.map((n, i) => (
                  <li key={i}>{formatLogNote(t, n)}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn primary" onClick={onClose}>
            {t('play.dayModal.close')}
          </button>
        </footer>
      </div>
    </div>
  );
}
