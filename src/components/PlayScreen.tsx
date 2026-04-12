import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnId, DayLog, GameConfig } from '../simulation/types';
import { createInteractiveRunner, membersNotAssignedToAnyCard } from '../simulation/engine';
import { buildWorkFillPulse, snapshotCardWork, type WorkFillPulse } from '../simulation/cardProgress';
import { buildCfdSeries } from '../simulation/metrics';
import { buildFinancialSummary } from '../simulation/financial';
import { formatLogNote } from '../i18n/formatLogNote';
import { KanbanBoard } from './KanbanBoard';
import { DaySummaryModal } from './DaySummaryModal';
import { DailyEventsCatalog } from './DailyEventsCatalog';
import { PlayChartsModal } from './PlayChartsModal';

type Props = {
  config: GameConfig;
  onBackToSetup: () => void;
};

export function PlayScreen({ config, onBackToSetup }: Props) {
  const { t } = useTranslation();
  const [runner, setRunner] = useState(() => createInteractiveRunner(config));
  const [, setTick] = useState(0);
  const [dayModalLog, setDayModalLog] = useState<DayLog | null>(null);
  const [assigneeError, setAssigneeError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [workFillPulse, setWorkFillPulse] = useState<WorkFillPulse | null>(null);
  const [chartsOpen, setChartsOpen] = useState(false);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!workFillPulse) return;
    const t = window.setTimeout(() => setWorkFillPulse(null), 920);
    return () => clearTimeout(t);
  }, [workFillPulse]);

  const logs = runner.getLogs();
  const board = runner.getBoard();
  const completed = runner.getCompleted();
  const lastLog = logs[logs.length - 1];
  const cfdData = buildCfdSeries(logs);
  const financialSummary = useMemo(
    () => buildFinancialSummary(config.backlogCards, completed, config.params),
    [config.backlogCards, config.params, completed],
  );
  const lastGlobalDay = lastLog?.globalDay ?? 0;

  const membersMissingFromCards = useMemo(
    () => membersNotAssignedToAnyCard(board, config.members),
    [board, config.members],
  );
  const blockAdvanceByAllocation =
    config.members.length > 0 && membersMissingFromCards.length > 0;

  const handleUpdateAssignees = useCallback(
    (cardId: string, assigneeIds: string[]) => {
      const r = runner.updateCardAssignees(cardId, assigneeIds);
      if (!r.ok) {
        setAssigneeError(t(r.errorKey, r.errorParams as Record<string, string | number> | undefined));
        return;
      }
      setAssigneeError(null);
      refresh();
    },
    [runner, refresh, t],
  );

  const handleManualMoveCard = useCallback(
    (cardId: string, _fromColumn: ColumnId, toColumn: ColumnId) => {
      void _fromColumn;
      const r = runner.manualMoveCard(cardId, toColumn);
      if (!r.ok) {
        const ep = r.errorParams as Record<string, string | number> | undefined;
        if (ep && typeof ep.col === 'string') {
          setMoveError(t(r.errorKey, { ...ep, col: t(`columns.${ep.col as ColumnId}`) }));
        } else {
          setMoveError(t(r.errorKey, ep));
        }
        return;
      }
      setMoveError(null);
      refresh();
    },
    [runner, refresh, t],
  );

  const guardAllocationOrAlert = (): boolean => {
    const missing = membersNotAssignedToAnyCard(runner.getBoard(), config.members);
    if (config.members.length === 0 || missing.length === 0) return true;
    window.alert(
      t('play.allocationBlocked', {
        names: missing.map((m) => m.name).join(', '),
      }),
    );
    return false;
  };

  const advanceOne = () => {
    setAssigneeError(null);
    setMoveError(null);
    if (!guardAllocationOrAlert()) return;
    const before = snapshotCardWork(runner.getBoard());
    const log = runner.step();
    refresh();
    if (log && (log.ceremony === 'daily_scrum' || log.ceremony === 'sprint_review')) {
      setWorkFillPulse(buildWorkFillPulse(before, runner.getBoard()));
    } else {
      setWorkFillPulse(null);
    }
    if (log) setDayModalLog(log);
  };

  const advanceSprint = () => {
    setAssigneeError(null);
    setMoveError(null);
    setWorkFillPulse(null);
    if (!guardAllocationOrAlert()) return;
    runner.advanceUntilAfterRetro();
    setDayModalLog(null);
    refresh();
  };

  const runAll = () => {
    setAssigneeError(null);
    setMoveError(null);
    setWorkFillPulse(null);
    if (!guardAllocationOrAlert()) return;
    const r = createInteractiveRunner(config);
    while (r.step()) {
      /* exhaust */
    }
    setRunner(r);
    setDayModalLog(null);
    refresh();
  };

  const resetMatch = () => {
    setAssigneeError(null);
    setMoveError(null);
    setWorkFillPulse(null);
    setRunner(createInteractiveRunner(config));
    setDayModalLog(null);
    refresh();
  };

  return (
    <div className="play-screen">
      {dayModalLog && (
        <DaySummaryModal
          log={dayModalLog}
          members={config.members}
          onClose={() => setDayModalLog(null)}
        />
      )}
      {chartsOpen && (
        <PlayChartsModal
          onClose={() => setChartsOpen(false)}
          cfdData={cfdData}
          completed={completed}
          cardsById={board.cardsById}
          financialSummary={financialSummary}
          lastGlobalDay={lastGlobalDay}
        />
      )}
      <header className="play-header">
        <div>
          <h1>{t('play.title')}</h1>
          <p className="muted">
            {t('play.metaLine', {
              seed: config.params.seed,
              daysPerSprint: config.params.daysPerSprint,
              numSprints: config.params.numSprints,
            })}
          </p>
        </div>
        <div className="play-header-actions">
          <button type="button" className="btn secondary" onClick={() => setChartsOpen(true)}>
            {t('play.chartsButton')}
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              const blob = new Blob(
                [
                  JSON.stringify(
                    {
                      config,
                      logs: runner.getLogs(),
                      completed: runner.getCompleted(),
                      finalBoard: runner.getBoard(),
                      financialSummary: buildFinancialSummary(
                        config.backlogCards,
                        runner.getCompleted(),
                        config.params,
                      ),
                    },
                    null,
                    2,
                  ),
                ],
                { type: 'application/json' },
              );
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'kanban-sinergia-resultado.json';
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            {t('play.exportResult')}
          </button>
          <button type="button" className="btn secondary" onClick={resetMatch}>
            {t('play.resetMatch')}
          </button>
          <button type="button" className="btn secondary" onClick={onBackToSetup}>
            {t('play.backToSetup')}
          </button>
        </div>
      </header>

      {lastLog ? (
        <div className="ceremony-banner">
          <span className="badge">{t('play.globalDay', { day: lastLog.globalDay })}</span>
          <span className="badge sprint">{t('play.sprintBadge', { n: lastLog.sprint })}</span>
          <span className="badge day">{t('play.dayBadge', { n: lastLog.dayInSprint })}</span>
          <strong>{t(`ceremonies.${lastLog.ceremony}`)}</strong>
        </div>
      ) : (
        <div className="ceremony-banner muted">{t('play.calendarHint')}</div>
      )}

      <div className="play-controls">
        <button
          type="button"
          className="btn primary"
          disabled={blockAdvanceByAllocation}
          title={
            blockAdvanceByAllocation
              ? t('play.allocationBlocked', {
                  names: membersMissingFromCards.map((m) => m.name).join(', '),
                })
              : undefined
          }
          onClick={advanceOne}
        >
          {t('play.advanceOneDay')}
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={blockAdvanceByAllocation}
          title={
            blockAdvanceByAllocation
              ? t('play.allocationBlocked', {
                  names: membersMissingFromCards.map((m) => m.name).join(', '),
                })
              : undefined
          }
          onClick={advanceSprint}
        >
          {t('play.advanceSprint')}
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={blockAdvanceByAllocation}
          title={
            blockAdvanceByAllocation
              ? t('play.allocationBlocked', {
                  names: membersMissingFromCards.map((m) => m.name).join(', '),
                })
              : undefined
          }
          onClick={runAll}
        >
          {t('play.runAll')}
        </button>
      </div>

      <DailyEventsCatalog />

      <div className="play-grid play-grid-main-only">
        <div className="play-main">
          <p className="muted kanban-assignees-hint">{t('play.kanbanAssigneesHint')}</p>
          <p className="muted small kanban-drag-card-hint">{t('play.kanbanDragCardsHint')}</p>
          {blockAdvanceByAllocation && (
            <div className="assignee-error-banner" role="alert">
              {t('play.allocationBlocked', {
                names: membersMissingFromCards.map((m) => m.name).join(', '),
              })}
              <span className="allocation-banner-hint">
                {' '}
                {t('play.allocationBlockedHint')}
              </span>
            </div>
          )}
          {assigneeError && (
            <div className="assignee-error-banner" role="alert">
              {assigneeError}
            </div>
          )}
          {moveError && (
            <div className="assignee-error-banner" role="alert">
              {moveError}
              <button type="button" className="btn secondary small" onClick={() => setMoveError(null)}>
                {t('play.dismissMoveError')}
              </button>
            </div>
          )}
          <KanbanBoard
            board={board}
            members={config.members}
            params={config.params}
            onUpdateAssignees={handleUpdateAssignees}
            onManualMoveCard={handleManualMoveCard}
            workFillPulse={workFillPulse}
          />
          {lastLog && lastLog.notes.length > 0 && (
            <div className="notes-box">
              <h4>{t('play.lastDayEvents')}</h4>
              <ul>
                {lastLog.notes.map((n, i) => (
                  <li key={i}>{formatLogNote(t, n)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
