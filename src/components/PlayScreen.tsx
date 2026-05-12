import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnId, DayLog, GameConfig } from '../simulation/types';
import {
  createInteractiveRunner,
  hasAnyCardOutsideBacklog,
  membersAssignedToMultipleWorkCards,
  membersNotAssignedToAnyCard,
} from '../simulation/engine';
import {
  buildWorkFillPulse,
  snapshotCardWork,
  workFillPulseDisplayMs,
  type WorkFillPulse,
} from '../simulation/cardProgress';
import { buildCfdSeries } from '../simulation/metrics';
import { buildFinancialSummary } from '../simulation/financial';
import { formatLogNote } from '../i18n/formatLogNote';
import { KanbanBoard } from './KanbanBoard';
import { DaySummaryModal } from './DaySummaryModal';
import { DailyEventsCatalogModal } from './DailyEventsCatalogModal';
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
  const workAnimTimersRef = useRef<number[]>([]);
  const [chartsOpen, setChartsOpen] = useState(false);
  const [dailyEventsOpen, setDailyEventsOpen] = useState(false);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  const clearWorkAnimTimers = useCallback(() => {
    for (const id of workAnimTimersRef.current) window.clearTimeout(id);
    workAnimTimersRef.current = [];
  }, []);

  useEffect(() => () => clearWorkAnimTimers(), [clearWorkAnimTimers]);

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
  const membersOverbooked = useMemo(
    () => membersAssignedToMultipleWorkCards(board, config.members),
    [board, config.members],
  );
  const unassignedActiveCardTitles = useMemo(() => {
    const out: string[] = [];
    const activeCols: ColumnId[] = ['analise', 'dev', 'teste'];
    for (const col of activeCols) {
      for (const id of board.columns[col]) {
        const c = board.cardsById[id];
        if (c && c.assigneeIds.length === 0) out.push(c.title);
      }
    }
    return out;
  }, [board]);
  const enforceAllocationRules = !config.params.clearAssigneesAfterEachDay;
  const blockAdvanceByAllocation =
    enforceAllocationRules &&
    config.members.length > 0 &&
    hasAnyCardOutsideBacklog(board) &&
    membersMissingFromCards.length > 0;
  const blockAdvanceByOverbook = enforceAllocationRules && membersOverbooked.length > 0;
  const blockAdvance = blockAdvanceByAllocation || blockAdvanceByOverbook;
  const showUnassignedBanner = !blockAdvance && unassignedActiveCardTitles.length > 0;

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
    if (!enforceAllocationRules) return true;
    const b = runner.getBoard();
    if (config.members.length === 0 || !hasAnyCardOutsideBacklog(b)) return true;
    const missing = membersNotAssignedToAnyCard(b, config.members);
    if (missing.length > 0) {
      window.alert(
        t('play.allocationBlocked', {
          names: missing.map((m) => m.name).join(', '),
        }),
      );
      return false;
    }
    const overbooked = membersAssignedToMultipleWorkCards(b, config.members);
    if (overbooked.length > 0) {
      window.alert(
        t('play.overbookedBlocked', {
          names: overbooked.map((m) => m.name).join(', '),
        }),
      );
      return false;
    }
    return true;
  };

  const advanceOne = () => {
    setAssigneeError(null);
    setMoveError(null);
    if (!guardAllocationOrAlert()) return;
    clearWorkAnimTimers();
    const before = snapshotCardWork(runner.getBoard());
    const isFirstAdvance = runner.getLogs().length === 0;
    let log = runner.step();
    // UX: no primeiro clique, já executa o primeiro dia útil após o Planning.
    if (isFirstAdvance && log?.ceremony === 'sprint_planning') {
      if (guardAllocationOrAlert()) {
        const next = runner.step();
        if (next) log = next;
      }
    }
    refresh();
    const boardAfter = runner.getBoard();

    if (log && (log.ceremony === 'daily_scrum' || log.ceremony === 'sprint_review')) {
      const pulse = buildWorkFillPulse(before, boardAfter);
      setWorkFillPulse(pulse);
      const dwellMs = workFillPulseDisplayMs(pulse, boardAfter) + 220;
      const tid = window.setTimeout(() => {
        setWorkFillPulse(null);
      }, dwellMs);
      workAnimTimersRef.current.push(tid);
    } else {
      setWorkFillPulse(null);
    }
  };

  const advanceSprint = () => {
    setAssigneeError(null);
    setMoveError(null);
    clearWorkAnimTimers();
    setWorkFillPulse(null);
    if (!guardAllocationOrAlert()) return;
    runner.advanceUntilAfterRetro();
    setDayModalLog(null);
    refresh();
  };

  const runAll = () => {
    setAssigneeError(null);
    setMoveError(null);
    clearWorkAnimTimers();
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
    clearWorkAnimTimers();
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
          cardsById={board.cardsById}
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
      {dailyEventsOpen && <DailyEventsCatalogModal onClose={() => setDailyEventsOpen(false)} />}
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
          <button type="button" className="btn secondary" onClick={() => setDailyEventsOpen(true)}>
            {t('play.dailyEventsCatalogButton')}
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
          disabled={blockAdvance}
          title={
            blockAdvanceByAllocation
              ? t('play.allocationBlocked', {
                  names: membersMissingFromCards.map((m) => m.name).join(', '),
                })
              : blockAdvanceByOverbook
                ? t('play.overbookedBlocked', {
                    names: membersOverbooked.map((m) => m.name).join(', '),
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
          disabled={!lastLog}
          onClick={() => {
            if (lastLog) setDayModalLog(lastLog);
          }}
        >
          {t('play.dayDetails')}
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={blockAdvance}
          title={
            blockAdvanceByAllocation
              ? t('play.allocationBlocked', {
                  names: membersMissingFromCards.map((m) => m.name).join(', '),
                })
              : blockAdvanceByOverbook
                ? t('play.overbookedBlocked', {
                    names: membersOverbooked.map((m) => m.name).join(', '),
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
          disabled={blockAdvance}
          title={
            blockAdvanceByAllocation
              ? t('play.allocationBlocked', {
                  names: membersMissingFromCards.map((m) => m.name).join(', '),
                })
              : blockAdvanceByOverbook
                ? t('play.overbookedBlocked', {
                    names: membersOverbooked.map((m) => m.name).join(', '),
                  })
              : undefined
          }
          onClick={runAll}
        >
          {t('play.runAll')}
        </button>
      </div>

      <div className="play-grid play-grid-main-only">
        <div className="play-main">
          <p className="muted small kanban-drag-card-hint">{t('play.kanbanDragCardsHint')}</p>
          <div className="stage-color-legend" aria-label={t('play.stageColorLegendTitle')}>
            <span className="stage-color-legend-title">{t('play.stageColorLegendTitle')}</span>
            <span className="stage-color-legend-item">
              <span className="stage-color-dot stage-color-dot--analysis" aria-hidden />
              {t('play.stageColorAnalysis')}
            </span>
            <span className="stage-color-legend-item">
              <span className="stage-color-dot stage-color-dot--dev" aria-hidden />
              {t('play.stageColorDev')}
            </span>
            <span className="stage-color-legend-item">
              <span className="stage-color-dot stage-color-dot--test" aria-hidden />
              {t('play.stageColorTest')}
            </span>
            <span className="stage-color-legend-item">
              <span className="stage-color-dot stage-color-dot--deploy" aria-hidden />
              {t('play.stageColorDeploy')}
            </span>
          </div>
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
          {blockAdvanceByOverbook && (
            <div className="assignee-error-banner" role="alert">
              {t('play.overbookedBlocked', {
                names: membersOverbooked.map((m) => m.name).join(', '),
              })}
              <span className="allocation-banner-hint"> {t('play.overbookedBlockedHint')}</span>
            </div>
          )}
          {showUnassignedBanner && (
            <div className="assignee-error-banner assignee-warning-banner" role="status">
              {t('play.unassignedActiveCards', {
                titles: unassignedActiveCardTitles.join(', '),
              })}
              <span className="allocation-banner-hint"> {t('play.unassignedActiveCardsHint')}</span>
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
            synergyByPair={config.synergyByPair}
            synergyPairBidirectional={config.synergyPairBidirectional}
            synergyDirected={config.synergyDirected}
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
