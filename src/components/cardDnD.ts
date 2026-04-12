import type { ColumnId } from '../simulation/types';

export const CARD_DRAG_MIME = 'application/x-kanban-card';

export type CardDragPayload = { cardId: string; fromColumn: ColumnId };

export function stringifyCardDragPayload(p: CardDragPayload): string {
  return JSON.stringify(p);
}

export function parseCardDragPayload(raw: string): CardDragPayload | null {
  try {
    const o = JSON.parse(raw) as CardDragPayload;
    if (typeof o.cardId === 'string' && typeof o.fromColumn === 'string') return o as CardDragPayload;
    return null;
  } catch {
    return null;
  }
}
