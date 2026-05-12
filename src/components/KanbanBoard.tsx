import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BoardState, ColumnId, Member, SimulationParams } from '../simulation/types';
import {
  canManuallyAdvanceCardFromColumn,
  ensureSynergyKeys,
  isManualCardMoveAllowed,
  resolveMemberIdFromToken,
  wipEffective,
} from '../simulation/engine';
import { formatMoney } from '../formatMoney';
import { CARD_DRAG_MIME, parseCardDragPayload, stringifyCardDragPayload } from './cardDnD';
import {
  ASSIGNEE_DRAG_MIME,
  assigneesAfterRemoveSlot,
  parseAssigneeDragPayload,
  stringifyAssigneeDragPayload,
} from './assigneeDnD';
import { AssigneeSlotsRow } from './AssigneeSlotsRow';
import { CardTaskStageBlocks } from './CardTaskStageBlocks';
import type { WorkFillPulse } from '../simulation/cardProgress';

const COLS: ColumnId[] = ['backlog', 'analise', 'dev', 'teste', 'deploy'];

/** Colunas onde um cartão conta como “em trabalho” no fluxo (fora disto = à espera). */
const FLOW_COLS: ColumnId[] = ['analise', 'dev', 'teste', 'deploy'];

const WIP_COLS: ColumnId[] = ['analise', 'dev', 'teste'];

type Props = {
  board: BoardState;
  members: Member[];
  params: SimulationParams;
  synergyByPair?: Record<string, number>;
  synergyPairBidirectional?: Record<string, boolean>;
  synergyDirected?: Record<string, number>;
  onUpdateAssignees: (cardId: string, assigneeIds: string[]) => void;
  onTransferAssignee: (
    sourceCardId: string,
    targetCardId: string,
    memberId: string,
    targetSlotIndex: number,
  ) => void;
  onManualMoveCard: (cardId: string, fromColumn: ColumnId, toColumn: ColumnId) => void;
  /** Mapa opcional: animação de progresso após avançar um dia de trabalho. */
  workFillPulse?: WorkFillPulse | null;
};

function specialtyToneClass(s: Member['specialty']): string {
  if (s === 'Analista') return 'tone-analyst';
  if (s === 'Desenvolvedor') return 'tone-dev';
  return 'tone-test';
}

function assigneeIdsInFlow(board: BoardState, members: Member[]): Set<string> {
  const ids = new Set<string>();
  for (const col of FLOW_COLS) {
    for (const cardId of board.columns[col]) {
      const c = board.cardsById[cardId];
      if (!c) continue;
      for (const aid of c.assigneeIds) {
        if (aid) ids.add(resolveMemberIdFromToken(members, aid));
      }
    }
  }
  return ids;
}

function canDropOnColumn(
  board: BoardState,
  cardId: string,
  from: ColumnId,
  to: ColumnId,
  wipLimit: number,
): boolean {
  if (from === to) return false;
  if (!isManualCardMoveAllowed(from, to)) return false;
  const card = board.cardsById[cardId];
  if (!card) return false;
  if (!canManuallyAdvanceCardFromColumn(card, from)) return false;
  if (WIP_COLS.includes(to) && board.columns[to].length >= wipLimit) return false;
  return true;
}

/** Preview do cartão junto ao cursor (HTML5 setDragImage). */
function setKanbanCardDragPreview(e: React.DragEvent): void {
  const handle = e.currentTarget as HTMLElement;
  const li = handle.closest('li.kanban-card') as HTMLElement | null;
  if (!li) return;
  const rect = li.getBoundingClientRect();
  const ghost = li.cloneNode(true) as HTMLElement;
  ghost.classList.add('kanban-drag-floating-clone');
  ghost.style.width = `${rect.width}px`;
  ghost.style.maxWidth = `${rect.width}px`;
  ghost.style.position = 'fixed';
  ghost.style.left = '-9999px';
  ghost.style.top = '0';
  ghost.style.pointerEvents = 'none';
  ghost.style.zIndex = '2147483647';
  ghost.querySelectorAll('[draggable]').forEach((node) => {
    (node as HTMLElement).removeAttribute('draggable');
  });
  document.body.appendChild(ghost);
  void ghost.offsetWidth;
  const offX = Math.min(Math.max(4, e.clientX - rect.left), rect.width - 4);
  const offY = Math.min(Math.max(4, e.clientY - rect.top), rect.height - 4);
  try {
    e.dataTransfer.setDragImage(ghost, offX, offY);
  } catch {
    /* Safari antigo / contextos restritos */
  }
  window.setTimeout(() => ghost.remove(), 0);
}

export function KanbanBoard({
  board,
  members,
  params,
  synergyByPair = {},
  synergyPairBidirectional,
  synergyDirected,
  onUpdateAssignees,
  onTransferAssignee,
  onManualMoveCard,
  workFillPulse = null,
}: Props) {
  const { t, i18n } = useTranslation();
  const currency = t('financial.currencyCode');
  const wipLimit = useMemo(() => wipEffective(params, members), [params, members]);

  const [cardDrag, setCardDrag] = useState<{ cardId: string; fromColumn: ColumnId } | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);
  const [assigneeDragActive, setAssigneeDragActive] = useState(false);
  const synergy = useMemo(
    () => ({
      synergyByPair: ensureSynergyKeys(members, synergyByPair),
      synergyPairBidirectional,
      synergyDirected,
    }),
    [members, synergyByPair, synergyPairBidirectional, synergyDirected],
  );

  const busy = assigneeIdsInFlow(board, members);
  const idleMembers = members.filter((m) => !busy.has(m.id));

  const clearAllDrags = useCallback(() => {
    setCardDrag(null);
    setDragOverColumn(null);
    setAssigneeDragActive(false);
  }, []);

  const handleColumnDragOver = useCallback(
    (e: React.DragEvent, col: ColumnId) => {
      // Com arrasto de responsável ativo, não interceptar aqui: os slots dos cartões já
      // fazem preventDefault + dropEffect 'copy'. Se definirmos 'none' no bubble da coluna,
      // o navegador deixa de aceitar o drop nos slots (regressão).
      if (assigneeDragActive) {
        setDragOverColumn(null);
        return;
      }
      e.preventDefault();
      if (!cardDrag) {
        e.dataTransfer.dropEffect = 'none';
        return;
      }
      const ok = canDropOnColumn(board, cardDrag.cardId, cardDrag.fromColumn, col, wipLimit);
      e.dataTransfer.dropEffect = ok ? 'move' : 'none';
      setDragOverColumn(ok ? col : null);
    },
    [board, cardDrag, wipLimit, assigneeDragActive],
  );

  const handleColumnDrop = useCallback(
    (e: React.DragEvent, col: ColumnId) => {
      e.preventDefault();
      if (assigneeDragActive) return;
      const raw = e.dataTransfer.getData(CARD_DRAG_MIME);
      const p = parseCardDragPayload(raw);
      clearAllDrags();
      if (!p) return;
      onManualMoveCard(p.cardId, p.fromColumn, col);
    },
    [assigneeDragActive, clearAllDrags, onManualMoveCard],
  );

  const handleAssigneePoolDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData(ASSIGNEE_DRAG_MIME);
      const p = parseAssigneeDragPayload(raw);
      clearAllDrags();
      if (p?.source !== 'slot') return;
      const card = board.cardsById[p.cardId];
      if (!card) return;
      const next = assigneesAfterRemoveSlot(card.assigneeIds, p.slotIndex);
      onUpdateAssignees(p.cardId, next);
    },
    [board, clearAllDrags, onUpdateAssignees],
  );

  const handleAssigneePoolDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className={`kanban-board-wrap${assigneeDragActive ? ' kanban-board-wrap--assignee-drag' : ''}`}>
      <div className="kanban-assignee-guide" aria-label={t('kanban.assigneeHowTitle')}>
        <p className="kanban-assignee-guide-title">{t('kanban.assigneeHowTitle')}</p>
        <ol className="kanban-assignee-guide-steps">
          <li>{t('kanban.assigneeHowStep1')}</li>
          <li>{t('kanban.assigneeHowStep2')}</li>
          <li>{t('kanban.assigneeHowStep3')}</li>
        </ol>
      </div>
      <div
        className="kanban-assignee-pool"
        onDragOver={handleAssigneePoolDragOver}
        onDrop={handleAssigneePoolDrop}
      >
        <div className="kanban-pool-head">
          <span className="kanban-pool-label">{t('kanban.assigneePoolLabel')}</span>
          <span className="muted small kanban-pool-sublabel">{t('kanban.assigneePoolSublabel')}</span>
        </div>
        {idleMembers.length === 0 ? (
          <span className="muted small">{t('kanban.assigneePoolEmpty')}</span>
        ) : (
          <ul className="kanban-member-roster">
            {idleMembers.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={`kanban-member-roster-chip ${specialtyToneClass(m.specialty)}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      ASSIGNEE_DRAG_MIME,
                      stringifyAssigneeDragPayload({ source: 'roster', memberId: m.id }),
                    );
                    e.dataTransfer.effectAllowed = 'copy';
                    setAssigneeDragActive(true);
                  }}
                  onDragEnd={() => setAssigneeDragActive(false)}
                >
                  {m.name}
                  <span className="kanban-member-roster-role">{t(`specialty.${m.specialty}`)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="kanban-idle-strip" aria-label={t('kanban.idleTitle')}>
        <span className="kanban-idle-label">{t('kanban.idleTitle')}</span>
        {idleMembers.length === 0 ? (
          <span className="kanban-idle-none muted">{t('kanban.idleNone')}</span>
        ) : (
          <ul className="kanban-idle-chips">
            {idleMembers.map((m) => (
              <li key={m.id} className={`kanban-idle-chip ${specialtyToneClass(m.specialty)}`}>
                <span className="kanban-idle-name">{m.name}</span>
                <span className="kanban-idle-role">{t(`specialty.${m.specialty}`)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="kanban-board">
        {COLS.map((col) => {
          const count = board.columns[col].length;
          const showWip = WIP_COLS.includes(col);
          const colActive = dragOverColumn === col && !assigneeDragActive;
          return (
            <div
              key={col}
              className={`kanban-col ${colActive ? 'kanban-col-drop-target' : ''}`}
              onDragOver={(e) => handleColumnDragOver(e, col)}
              onDragLeave={(e) => {
                const rel = e.relatedTarget as Node | null;
                if (!rel || !e.currentTarget.contains(rel)) setDragOverColumn(null);
              }}
              onDrop={(e) => handleColumnDrop(e, col)}
            >
              <h4>
                {t(`columns.${col}`)}{' '}
                <span className="count">
                  ({showWip ? t('kanban.wipCount', { n: count, wip: wipLimit }) : count})
                </span>
              </h4>
              <ul>
                {board.columns[col].map((id) => {
                  const c = board.cardsById[id]!;
                  const readOnlyAssignees = col === 'deploy' || col === 'backlog';
                  const canDragCard = col !== 'deploy';
                  const dragBlockedByStage =
                    WIP_COLS.includes(col) && !canManuallyAdvanceCardFromColumn(c, col);
                  const canUseDragHandle = canDragCard && !dragBlockedByStage;
                  return (
                    <li key={id} className="kanban-card">
                      <div className="card-title-row">
                        {canUseDragHandle ? (
                          <span
                            className="kanban-card-drag-handle"
                            draggable
                            title={t('kanban.dragHandleTitle')}
                            onDragStart={(e) => {
                              const payload = { cardId: id, fromColumn: col };
                              e.dataTransfer.setData(CARD_DRAG_MIME, stringifyCardDragPayload(payload));
                              e.dataTransfer.effectAllowed = 'move';
                              setKanbanCardDragPreview(e);
                              setCardDrag(payload);
                            }}
                            onDragEnd={() => clearAllDrags()}
                            aria-grabbed={cardDrag?.cardId === id}
                          >
                            ⋮⋮
                          </span>
                        ) : (
                          <span
                            className="kanban-card-drag-handle kanban-card-drag-handle-disabled"
                            aria-hidden={col === 'deploy'}
                            title={
                              col === 'deploy'
                                ? undefined
                                : dragBlockedByStage
                                  ? t('play.manualMoveStageIncomplete')
                                  : undefined
                            }
                          >
                            ⋮⋮
                          </span>
                        )}
                        <div className="card-title">{c.title}</div>
                        <span className="task-kind-pill">{t(`taskKind.${c.taskKind ?? 'backend'}`)}</span>
                      </div>
                      <div className="card-meta card-meta-scoring">
                        <span className="card-scoring-line">
                          {c.points} {t('kanban.pts')} · {t('kanban.remaining')} {c.remainingInStage.toFixed(1)}
                          {c.assigneeIds.length >= 2 ? ` · ${t('kanban.collabShort')}` : ''}
                        </span>
                        <span className="card-scoring-stages muted">
                          {t('kanban.stageUnitsShort', {
                            a: c.workAnalise,
                            d: c.workDev,
                            te: c.workTeste,
                          })}
                        </span>
                      </div>
                      {(c.businessValue ?? 0) > 0 || c.dueGlobalDay != null ? (
                        <div className="card-meta card-meta-finance">
                          {(c.businessValue ?? 0) > 0 ? (
                            <span className="card-finance-value">
                              {formatMoney(c.businessValue ?? 0, i18n.language, currency)}
                            </span>
                          ) : null}
                          {c.dueGlobalDay != null ? (
                            <span className="card-finance-due">
                              {(c.businessValue ?? 0) > 0 ? <span className="card-finance-sep">·</span> : null}
                              {t('kanban.financialDue', { day: c.dueGlobalDay })}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      <CardTaskStageBlocks card={c} columnId={col} pulse={workFillPulse?.[id] ?? null} />
                      <div className="card-assignees">
                        <span className="card-assignees-label">{t('setup.tableAssignees')}</span>
                        <AssigneeSlotsRow
                          cardId={id}
                          assigneeIds={c.assigneeIds}
                          members={members}
                          readOnly={readOnlyAssignees}
                          card={c}
                          columnId={col}
                          board={board}
                          params={params}
                          synergy={synergy}
                          dropTargetsActive={assigneeDragActive}
                          onApply={(next) => onUpdateAssignees(id, next)}
                          onTransferAssignee={onTransferAssignee}
                          onAssigneeDragActiveChange={setAssigneeDragActive}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
