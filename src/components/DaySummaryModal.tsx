import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  COLUMN_ORDER,
  type BoardCard,
  type DayLog,
  type Member,
  type MemberCardWorkDelivery,
} from '../simulation/types';
import { formatLogNote } from '../i18n/formatLogNote';

type Props = {
  log: DayLog;
  members: Member[];
  cardsById: Record<string, BoardCard>;
  onClose: () => void;
};

function aggregateDeliveries(
  deliveries: MemberCardWorkDelivery[],
): Map<string, { memberId: string; cardId: string; points: number }> {
  const m = new Map<string, { memberId: string; cardId: string; points: number }>();
  for (const d of deliveries) {
    const k = `${d.memberId}::${d.cardId}`;
    const prev = m.get(k);
    m.set(k, {
      memberId: d.memberId,
      cardId: d.cardId,
      points: (prev?.points ?? 0) + d.storyPoints,
    });
  }
  return m;
}

function formatStoryPtsDay(x: number): string {
  const r = Math.round(x * 100) / 100;
  if (Number.isInteger(r)) return String(r);
  return r.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export function DaySummaryModal({ log, members, cardsById, onClose }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const memberById = (id: string) => members.find((m) => m.id === id);

  const hasCapacitySteps = !!(
    log.capacityBreakdownByMemberId &&
    Object.keys(log.capacityBreakdownByMemberId).length > 0
  );

  const deliveryRows = useMemo(() => {
    const w = log.workDeliveries ?? [];
    if (w.length === 0) return [] as { memberId: string; cardId: string; points: number }[];
    const agg = aggregateDeliveries(w);
    const arr = [...agg.values()].filter((r) => r.points > 1e-9);
    const mName = (id: string) => memberById(id)?.name ?? id;
    const cTitle = (id: string) => cardsById[id]?.title ?? id;
    arr.sort((a, b) => {
      const na = mName(a.memberId).localeCompare(mName(b.memberId), undefined, { sensitivity: 'base' });
      if (na !== 0) return na;
      return cTitle(a.cardId).localeCompare(cTitle(b.cardId), undefined, { sensitivity: 'base' });
    });
    return arr;
  }, [log.workDeliveries, members, cardsById]);

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
                <p className="day-modal-footnote muted">{t('play.dayModal.capacityMultFootnote')}</p>
                <div className="day-modal-table-wrap">
                  <table className="day-modal-table">
                    <thead>
                      <tr>
                        <th>{t('play.dayModal.colMember')}</th>
                        <th>{t('play.dayModal.colRoll')}</th>
                        {hasCapacitySteps ? (
                          <>
                            <th>{t('play.dayModal.colAfterSpecialist')}</th>
                            <th>{t('play.dayModal.colAfterRoles')}</th>
                            <th>{t('play.dayModal.colAfterDaily')}</th>
                          </>
                        ) : null}
                        <th>{t('play.dayModal.colEffective')}</th>
                        <th>{t('play.dayModal.colDeltaVsBase')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => {
                        const base = log.diceByMemberId[m.id];
                        const eff = log.effectiveCapacityByMemberId[m.id];
                        const bd = log.capacityBreakdownByMemberId?.[m.id];
                        const delta =
                          typeof base === 'number' && typeof eff === 'number' ? eff - base : null;
                        return (
                          <tr key={m.id}>
                            <td>{m.name}</td>
                            <td>{base ?? '—'}</td>
                            {hasCapacitySteps ? (
                              bd ? (
                                <>
                                  <td>{bd.afterSpecialist}</td>
                                  <td>{bd.afterRoleBonus}</td>
                                  <td>{bd.afterDailyEvent}</td>
                                </>
                              ) : (
                                <>
                                  <td>—</td>
                                  <td>—</td>
                                  <td>—</td>
                                </>
                              )
                            ) : null}
                            <td>{eff ?? '—'}</td>
                            <td
                              className={
                                delta === null
                                  ? 'day-modal-delta'
                                  : delta > 0
                                    ? 'day-modal-delta day-modal-delta-pos'
                                    : delta < 0
                                      ? 'day-modal-delta day-modal-delta-neg'
                                      : 'day-modal-delta day-modal-delta-zero'
                              }
                            >
                              {delta === null ? '—' : delta > 0 ? `+${delta}` : String(delta)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

          {(log.ceremony === 'daily_scrum' || log.ceremony === 'sprint_review') && (
            <section className="day-modal-section">
              <h3>{t('play.dayModal.workByTaskTitle')}</h3>
              <p className="muted small day-modal-work-intro">{t('play.dayModal.workByTaskIntro')}</p>
              {deliveryRows.length === 0 ? (
                <p className="muted">{t('play.dayModal.noWorkDeliveries')}</p>
              ) : (
                <div className="day-modal-table-wrap">
                  <table className="day-modal-table day-modal-work-table">
                    <thead>
                      <tr>
                        <th>{t('play.dayModal.colMember')}</th>
                        <th>{t('play.dayModal.colTask')}</th>
                        <th className="narrow-num">{t('play.dayModal.colStoryPtsDay')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryRows.map((row) => (
                        <tr key={`${row.memberId}-${row.cardId}`}>
                          <td>{memberById(row.memberId)?.name ?? row.memberId}</td>
                          <td>{cardsById[row.cardId]?.title ?? row.cardId}</td>
                          <td className="narrow-num">{formatStoryPtsDay(row.points)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <section className="day-modal-section">
            <h3>{t('play.dayModal.boardTitle')}</h3>
            <ul className="day-modal-columns">
              {COLUMN_ORDER.map((col) => (
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
