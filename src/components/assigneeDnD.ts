export const ASSIGNEE_DRAG_MIME = 'application/x-kanban-assignee';

export type AssigneeDragPayload =
  | { source: 'roster'; memberId: string }
  | { source: 'slot'; memberId: string; cardId: string; slotIndex: number };

export function parseAssigneeDragPayload(raw: string): AssigneeDragPayload | null {
  try {
    const o = JSON.parse(raw) as AssigneeDragPayload;
    if (o.source === 'roster' && typeof o.memberId === 'string' && o.memberId.length > 0) return o;
    if (
      o.source === 'slot' &&
      typeof o.memberId === 'string' &&
      o.memberId.length > 0 &&
      typeof o.cardId === 'string' &&
      o.cardId.length > 0
    ) {
      const si = (o as { slotIndex?: unknown }).slotIndex;
      const slotIndex =
        typeof si === 'number' && Number.isFinite(si) ? Math.max(0, Math.floor(si)) : 0;
      return { ...o, slotIndex };
    }
    return null;
  } catch {
    return null;
  }
}

export function stringifyAssigneeDragPayload(p: AssigneeDragPayload): string {
  return JSON.stringify(p);
}

/** Remove one occurrence of `memberId` from `current`, then insert it at `slotIndex` (0…after removal length). */
export function assigneesAfterSlotDrop(
  current: string[],
  slotIndex: number,
  memberId: string,
): string[] {
  const ix = current.indexOf(memberId);
  const without = ix >= 0 ? [...current.slice(0, ix), ...current.slice(ix + 1)] : [...current];
  const idx = Math.max(0, Math.min(slotIndex, without.length));
  const next = [...without];
  next.splice(idx, 0, memberId);
  return next;
}

export function assigneesAfterRemoveSlot(current: string[], slotIndex: number): string[] {
  return current.filter((_, i) => i !== slotIndex);
}
