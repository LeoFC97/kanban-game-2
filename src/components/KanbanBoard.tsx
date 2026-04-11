import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { BoardState, ColumnId, Member } from '../simulation/types';

const COLS: ColumnId[] = ['backlog', 'ready', 'analise', 'dev', 'teste', 'deploy'];

/** Colunas onde um cartão conta como “em trabalho” no fluxo (fora disto = à espera). */
const FLOW_COLS: ColumnId[] = ['ready', 'analise', 'dev', 'teste', 'deploy'];

type Props = {
  board: BoardState;
  members: Member[];
  onUpdateAssignees: (cardId: string, assigneeIds: string[]) => void;
};

function memberName(members: Member[], id: string): string {
  return members.find((m) => m.id === id)?.name ?? id;
}

function assigneeIdsInFlow(board: BoardState): Set<string> {
  const ids = new Set<string>();
  for (const col of FLOW_COLS) {
    for (const cardId of board.columns[col]) {
      const c = board.cardsById[cardId];
      if (!c) continue;
      for (const aid of c.assigneeIds) {
        if (aid) ids.add(aid);
      }
    }
  }
  return ids;
}

export function KanbanBoard({ board, members, onUpdateAssignees }: Props) {
  const { t } = useTranslation();
  const memberIds = members.map((m) => m.id);

  const idleMembers = useMemo(() => {
    const busy = assigneeIdsInFlow(board);
    return members.filter((m) => !busy.has(m.id));
  }, [board, members]);

  return (
    <div className="kanban-board-wrap">
      <div className="kanban-idle-strip" aria-label={t('kanban.idleTitle')}>
        <span className="kanban-idle-label">{t('kanban.idleTitle')}</span>
        {idleMembers.length === 0 ? (
          <span className="kanban-idle-none muted">{t('kanban.idleNone')}</span>
        ) : (
          <ul className="kanban-idle-chips">
            {idleMembers.map((m) => (
              <li key={m.id} className="kanban-idle-chip">
                <span className="kanban-idle-name">{m.name}</span>
                <span className="kanban-idle-role">{t(`specialty.${m.specialty}`)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="kanban-board">
      {COLS.map((col) => (
        <div key={col} className="kanban-col">
          <h4>
            {t(`columns.${col}`)} <span className="count">({board.columns[col].length})</span>
          </h4>
          <ul>
            {board.columns[col].map((id) => {
              const c = board.cardsById[id]!;
              const readOnlyAssignees = col === 'deploy';
              return (
                <li key={id} className="kanban-card">
                  <div className="card-title-row">
                    <div className="card-title">{c.title}</div>
                    <span className="task-kind-pill">{t(`taskKind.${c.taskKind ?? 'backend'}`)}</span>
                  </div>
                  <div className="card-meta">
                    {c.points} {t('kanban.pts')} · {t('kanban.remaining')} {c.remainingInStage.toFixed(1)}
                    {c.assigneeIds.length >= 2 ? ` · ${t('kanban.collabShort')}` : ''}
                    {(c.businessValue ?? 0) > 0 || c.dueGlobalDay != null ? (
                      <>
                        {' · '}
                        {(c.businessValue ?? 0) > 0
                          ? t('kanban.financialValue', { v: (c.businessValue ?? 0).toLocaleString() })
                          : null}
                        {c.dueGlobalDay != null
                          ? ((c.businessValue ?? 0) > 0 ? ' · ' : '') +
                            t('kanban.financialDue', { day: c.dueGlobalDay })
                          : null}
                      </>
                    ) : null}
                  </div>
                  <div className="card-assignees">
                    <span className="card-assignees-label">{t('setup.tableAssignees')}</span>
                    {readOnlyAssignees ? (
                      <span className="card-assignees-readonly">
                        {c.assigneeIds.length === 0
                          ? '—'
                          : c.assigneeIds.map((aid) => memberName(members, aid)).join(' · ')}
                      </span>
                    ) : (
                      <div className="assignee-row kanban-assignee-row">
                        <select
                          className="input"
                          value={c.assigneeIds[0] ?? ''}
                          onChange={(e) => {
                            const a = e.target.value;
                            const b = c.assigneeIds[1];
                            if (b && b !== a) onUpdateAssignees(id, [a, b]);
                            else onUpdateAssignees(id, a ? [a] : []);
                          }}
                        >
                          {members.map((mem) => (
                            <option key={mem.id} value={mem.id}>
                              {mem.name}
                            </option>
                          ))}
                        </select>
                        <select
                          className="input"
                          value={c.assigneeIds[1] ?? ''}
                          onChange={(e) => {
                            const b = e.target.value;
                            const a = c.assigneeIds[0] ?? memberIds[0] ?? '';
                            if (!b) onUpdateAssignees(id, a ? [a] : []);
                            else onUpdateAssignees(id, a ? [a, b] : [b]);
                          }}
                        >
                          <option value="">{t('setup.assigneeOptional')}</option>
                          {members.map((mem) => (
                            <option key={mem.id} value={mem.id}>
                              {mem.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      </div>
    </div>
  );
}
