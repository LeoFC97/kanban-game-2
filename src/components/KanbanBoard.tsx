import { useTranslation } from 'react-i18next';
import type { BoardState, ColumnId } from '../simulation/types';

const COLS: ColumnId[] = ['backlog', 'ready', 'analise', 'dev', 'teste', 'deploy'];

type Props = { board: BoardState };

export function KanbanBoard({ board }: Props) {
  const { t } = useTranslation();

  return (
    <div className="kanban-board">
      {COLS.map((col) => (
        <div key={col} className="kanban-col">
          <h4>
            {t(`columns.${col}`)} <span className="count">({board.columns[col].length})</span>
          </h4>
          <ul>
            {board.columns[col].map((id) => {
              const c = board.cardsById[id];
              return (
                <li key={id} className="kanban-card">
                  <div className="card-title">{c.title}</div>
                  <div className="card-meta">
                    {c.points} {t('kanban.pts')} · {t('kanban.remaining')} {c.remainingInStage.toFixed(1)}
                    {c.collaborative ? ` · ${t('kanban.collabShort')}` : ''}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
