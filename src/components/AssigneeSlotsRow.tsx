import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BoardCard, BoardState, ColumnId, Member, SimulationParams, SynergyRuntime } from '../simulation/types';
import { estimateAssigneeDailyRangeOnCard, resolveMemberFromToken } from '../simulation/assigneeDailyEstimate';
import {
  ASSIGNEE_DRAG_MIME,
  assigneesAfterSlotDrop,
  parseAssigneeDragPayload,
  stringifyAssigneeDragPayload,
} from './assigneeDnD';

type Props = {
  cardId: string;
  assigneeIds: string[];
  members: Member[];
  readOnly: boolean;
  card?: BoardCard;
  columnId?: ColumnId;
  board?: BoardState;
  params?: SimulationParams;
  synergy?: SynergyRuntime;
  /** Destaca caixas de largada quando alguém arrasta um nome da equipa. */
  dropTargetsActive?: boolean;
  onApply: (nextIds: string[]) => void;
  onAssigneeDragActiveChange?: (active: boolean) => void;
};

function memberForToken(members: Member[], token: string): Member | undefined {
  return resolveMemberFromToken(members, token);
}

function nameFor(members: Member[], id: string): string {
  return memberForToken(members, id)?.name ?? id;
}

function specialtyToneClass(m?: Member): string {
  if (!m) return '';
  if (m.specialty === 'Analista') return 'tone-analyst';
  if (m.specialty === 'Desenvolvedor') return 'tone-dev';
  return 'tone-test';
}

type HoverKey = number | 'append' | null;

export function AssigneeSlotsRow({
  cardId,
  assigneeIds,
  members,
  readOnly,
  card,
  columnId,
  board,
  params,
  synergy,
  dropTargetsActive = false,
  onApply,
  onAssigneeDragActiveChange,
}: Props) {
  const { t } = useTranslation();
  const [hoverSlot, setHoverSlot] = useState<HoverKey>(null);
  const [openTooltipKey, setOpenTooltipKey] = useState<string | null>(null);

  if (readOnly) {
    return (
      <span className="card-assignees-readonly">
        {assigneeIds.length === 0 ? '—' : assigneeIds.map((id) => nameFor(members, id)).join(' · ')}
      </span>
    );
  }

  const appendIndex = assigneeIds.length;

  const renderSlot = (slotIndex: number, id: string | undefined, isAppend: boolean) => {
    const has = Boolean(id);
    const member = id ? memberForToken(members, id) : undefined;
    const estimate =
      id && member && card && columnId && board && params && synergy
        ? estimateAssigneeDailyRangeOnCard({
            card,
            columnId,
            assigneeToken: id,
            members,
            board,
            params,
            synergy,
          })
        : null;
    const tooltipKey = estimate ? `${estimate.memberId}::${cardId}::${slotIndex}` : null;
    const tooltipOpen = !!tooltipKey && openTooltipKey === tooltipKey;
    const hover =
      hoverSlot === (isAppend ? 'append' : slotIndex) ? 'assignee-drop-slot-hover' : '';
    const pulseDrop = dropTargetsActive && !has ? 'assignee-drop-slot--pulse-target' : '';
    return (
      <div
        key={isAppend ? 'append' : `s-${slotIndex}-${id}`}
        className={`assignee-drop-slot ${isAppend ? 'assignee-drop-slot--add' : ''} ${hover} ${pulseDrop}`}
        onDragEnter={() => setHoverSlot(isAppend ? 'append' : slotIndex)}
        onDragLeave={(e) => {
          const rel = e.relatedTarget as Node | null;
          if (!rel || !e.currentTarget.contains(rel)) setHoverSlot(null);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setHoverSlot(null);
          const raw = e.dataTransfer.getData(ASSIGNEE_DRAG_MIME);
          const p = parseAssigneeDragPayload(raw);
          if (!p || p.memberId === id) return;
          // Roster: adicionar pessoa (com deslocamento se slot ocupado).
          // Slot do mesmo cartão: reordenar internamente (move o chip para o slot alvo).
          // Slot de outro cartão: ignorar (movimento entre cartões violaria a regra de 1 cartão ativo por pessoa).
          if (
            p.source === 'roster' ||
            (p.source === 'slot' && p.cardId === cardId)
          ) {
            onApply(assigneesAfterSlotDrop(assigneeIds, isAppend ? appendIndex : slotIndex, p.memberId));
          }
        }}
      >
        {has ? (
          <span className="assignee-chip-wrap">
            <span
              className={`assignee-chip assignee-chip-draggable ${specialtyToneClass(member)}`}
              draggable
              aria-describedby={estimate ? `assignee-tip-${cardId}-${slotIndex}` : undefined}
              onMouseEnter={() => {
                if (tooltipKey) setOpenTooltipKey(tooltipKey);
              }}
              onMouseLeave={() =>
                setOpenTooltipKey((prev) => (prev === tooltipKey ? null : prev))
              }
              onFocus={() => {
                if (tooltipKey) setOpenTooltipKey(tooltipKey);
              }}
              onBlur={() =>
                setOpenTooltipKey((prev) => (prev === tooltipKey ? null : prev))
              }
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  ASSIGNEE_DRAG_MIME,
                  stringifyAssigneeDragPayload({
                    source: 'slot',
                    memberId: id!,
                    cardId,
                    slotIndex,
                  }),
                );
                e.dataTransfer.effectAllowed = 'move';
                e.stopPropagation();
                onAssigneeDragActiveChange?.(true);
              }}
              onDragEnd={() => {
                onAssigneeDragActiveChange?.(false);
                setOpenTooltipKey((prev) => (prev === tooltipKey ? null : prev));
              }}
            >
              {nameFor(members, id!)}
            </span>
            {estimate && tooltipOpen && (
              <div
                id={`assignee-tip-${cardId}-${slotIndex}`}
                role="tooltip"
                className="assignee-formula-tooltip"
              >
                <p className="assignee-formula-title">
                  {t('kanban.tooltip.title', { name: estimate.memberName })}
                </p>
                <p className="assignee-formula-line">
                  {t('kanban.tooltip.base', { min: estimate.baseMin, max: estimate.baseMax })}
                </p>
                <p className="assignee-formula-line">
                  {t('kanban.tooltip.specialist', {
                    col: t(`columns.${estimate.specialtyCol}`),
                    mult: estimate.specialistMult.toFixed(2),
                  })}
                  {!estimate.specialistApplied ? (
                    <span className="assignee-formula-note"> {t('kanban.tooltip.specialistNoWork')}</span>
                  ) : null}
                </p>
                <p className="assignee-formula-line">
                  {t('kanban.tooltip.roles', { mult: estimate.roleMult.toFixed(2) })}
                </p>
                <p className="assignee-formula-line">
                  {t('kanban.tooltip.randomEvent', {
                    min: estimate.eventMultMin.toFixed(2),
                    max: estimate.eventMultMax.toFixed(2),
                  })}
                </p>
                <p className="assignee-formula-line">
                  {estimate.avgSynergy != null
                    ? t('kanban.tooltip.synergyDevWithS', {
                        s: estimate.avgSynergy.toFixed(2),
                        mult: estimate.collabMult.toFixed(2),
                      })
                    : t('kanban.tooltip.synergyDev', { mult: estimate.collabMult.toFixed(2) })}
                </p>
                <p className="assignee-formula-range">
                  {t('kanban.tooltip.range', {
                    min: estimate.minPointsOnCard.toFixed(1),
                    max: estimate.maxPointsOnCard.toFixed(1),
                  })}
                </p>
                <p className="assignee-formula-foot">
                  {t('kanban.tooltip.stageCap', { cap: estimate.cardRemainingCap.toFixed(1) })}
                </p>
                <p className="assignee-formula-foot muted">{t('kanban.dragAssigneeOff')}</p>
              </div>
            )}
          </span>
        ) : (
          <span className="assignee-slot-placeholder muted">
            {dropTargetsActive ? t('kanban.assigneeSlotDropHere') : t('kanban.assigneeSlotAdd')}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="assignee-drop-slots" onDragEnd={() => setHoverSlot(null)}>
      {assigneeIds.map((id, slotIndex) => renderSlot(slotIndex, id, false))}
      {renderSlot(appendIndex, undefined, true)}
    </div>
  );
}
