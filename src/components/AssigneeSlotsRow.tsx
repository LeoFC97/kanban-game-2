import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Member } from '../simulation/types';
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
  onApply: (nextIds: string[]) => void;
  onAssigneeDragActiveChange?: (active: boolean) => void;
};

function nameFor(members: Member[], id: string): string {
  return members.find((m) => m.id === id)?.name ?? id;
}

type HoverKey = number | 'append' | null;

export function AssigneeSlotsRow({
  cardId,
  assigneeIds,
  members,
  readOnly,
  onApply,
  onAssigneeDragActiveChange,
}: Props) {
  const { t } = useTranslation();
  const [hoverSlot, setHoverSlot] = useState<HoverKey>(null);

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
    const hover =
      hoverSlot === (isAppend ? 'append' : slotIndex) ? 'assignee-drop-slot-hover' : '';
    return (
      <div
        key={isAppend ? 'append' : `s-${slotIndex}-${id}`}
        className={`assignee-drop-slot ${isAppend ? 'assignee-drop-slot--add' : ''} ${hover}`}
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
          if (p.source === 'roster') {
            onApply(assigneesAfterSlotDrop(assigneeIds, isAppend ? appendIndex : slotIndex, p.memberId));
          }
        }}
      >
        {has ? (
          <span
            className="assignee-chip assignee-chip-draggable"
            draggable
            title={t('kanban.dragAssigneeOff')}
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
            onDragEnd={() => onAssigneeDragActiveChange?.(false)}
          >
            {nameFor(members, id!)}
          </span>
        ) : (
          <span className="assignee-slot-placeholder muted">{t('kanban.assigneeSlotAdd')}</span>
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
