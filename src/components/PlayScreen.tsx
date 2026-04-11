import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DayLog, GameConfig } from '../simulation/types';
import { createInteractiveRunner } from '../simulation/engine';
import { buildCfdSeries } from '../simulation/metrics';
import { formatLogNote } from '../i18n/formatLogNote';
import { KanbanBoard } from './KanbanBoard';
import { CfdChart } from './CfdChart';
import { CycleTimeSummary } from './CycleTimeSummary';
import { DaySummaryModal } from './DaySummaryModal';
import { DailyEventsCatalog } from './DailyEventsCatalog';

type Props = {
  config: GameConfig;
  onBackToSetup: () => void;
};

export function PlayScreen({ config, onBackToSetup }: Props) {
  const { t } = useTranslation();
  const [runner, setRunner] = useState(() => createInteractiveRunner(config));
  const [, setTick] = useState(0);
  const [dayModalLog, setDayModalLog] = useState<DayLog | null>(null);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  const logs = runner.getLogs();
  const board = runner.getBoard();
  const completed = runner.getCompleted();
  const lastLog = logs[logs.length - 1];
  const cfdData = buildCfdSeries(logs);

  const advanceOne = () => {
    const log = runner.step();
    refresh();
    if (log) setDayModalLog(log);
  };

  const advanceSprint = () => {
    runner.advanceUntilAfterRetro();
    setDayModalLog(null);
    refresh();
  };

  const runAll = () => {
    const r = createInteractiveRunner(config);
    while (r.step()) {
      /* exhaust */
    }
    setRunner(r);
    setDayModalLog(null);
    refresh();
  };

  const resetMatch = () => {
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
        <button type="button" className="btn primary" onClick={advanceOne}>
          {t('play.advanceOneDay')}
        </button>
        <button type="button" className="btn secondary" onClick={advanceSprint}>
          {t('play.advanceSprint')}
        </button>
        <button type="button" className="btn secondary" onClick={runAll}>
          {t('play.runAll')}
        </button>
      </div>

      <DailyEventsCatalog />

      <div className="play-grid">
        <div className="play-main">
          <KanbanBoard board={board} />
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
        <aside className="play-side">
          <CfdChart data={cfdData} />
          <CycleTimeSummary completed={completed} cardsById={board.cardsById} />
        </aside>
      </div>
    </div>
  );
}
