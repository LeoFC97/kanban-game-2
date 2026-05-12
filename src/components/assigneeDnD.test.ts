import { describe, expect, it } from 'vitest';
import {
  assigneesAfterRemoveSlot,
  assigneesAfterSlotDrop,
  parseAssigneeDragPayload,
  stringifyAssigneeDragPayload,
} from './assigneeDnD';

describe('assigneesAfterSlotDrop — semântica de insert-com-deslocamento', () => {
  it('adiciona membro novo num slot vazio (append)', () => {
    expect(assigneesAfterSlotDrop(['a'], 1, 'b')).toEqual(['a', 'b']);
  });

  it('insere antes de slot ocupado, deslocando o ocupante uma posição', () => {
    // ['a','b','c']: dropar 'd' no slot 1 → ['a','d','b','c'] (b e c se deslocam)
    expect(assigneesAfterSlotDrop(['a', 'b', 'c'], 1, 'd')).toEqual(['a', 'd', 'b', 'c']);
  });

  it('reordenação intra-cartão: move membro existente para slot alvo (remove + reinsere)', () => {
    // ['a','b','c']: dropar 'a' no slot 2 → remove 'a' → ['b','c'] → insere em 2 → ['b','c','a']
    expect(assigneesAfterSlotDrop(['a', 'b', 'c'], 2, 'a')).toEqual(['b', 'c', 'a']);
  });

  it('drop no próprio slot é no-op', () => {
    expect(assigneesAfterSlotDrop(['a', 'b'], 0, 'a')).toEqual(['a', 'b']);
  });

  it('slotIndex fora do range é clampado em [0, len após remoção]', () => {
    expect(assigneesAfterSlotDrop(['a', 'b'], 99, 'c')).toEqual(['a', 'b', 'c']);
    expect(assigneesAfterSlotDrop(['a', 'b'], -5, 'c')).toEqual(['c', 'a', 'b']);
  });
});

describe('assigneesAfterRemoveSlot', () => {
  it('remove apenas o slot indicado', () => {
    expect(assigneesAfterRemoveSlot(['a', 'b', 'c'], 1)).toEqual(['a', 'c']);
  });

  it('slot fora do range não altera a lista', () => {
    expect(assigneesAfterRemoveSlot(['a', 'b'], 5)).toEqual(['a', 'b']);
  });
});

describe('parseAssigneeDragPayload', () => {
  it('aceita roster com memberId não-vazio', () => {
    const raw = stringifyAssigneeDragPayload({ source: 'roster', memberId: 'm1' });
    expect(parseAssigneeDragPayload(raw)).toEqual({ source: 'roster', memberId: 'm1' });
  });

  it('rejeita roster com memberId vazio', () => {
    expect(parseAssigneeDragPayload(JSON.stringify({ source: 'roster', memberId: '' }))).toBeNull();
  });

  it('aceita slot com cardId e memberId válidos', () => {
    const raw = stringifyAssigneeDragPayload({
      source: 'slot',
      memberId: 'm1',
      cardId: 'c1',
      slotIndex: 0,
    });
    expect(parseAssigneeDragPayload(raw)).toEqual({
      source: 'slot',
      memberId: 'm1',
      cardId: 'c1',
      slotIndex: 0,
    });
  });

  it('rejeita slot com cardId vazio', () => {
    expect(
      parseAssigneeDragPayload(
        JSON.stringify({ source: 'slot', memberId: 'm1', cardId: '', slotIndex: 0 }),
      ),
    ).toBeNull();
  });

  it('rejeita slot com memberId vazio', () => {
    expect(
      parseAssigneeDragPayload(
        JSON.stringify({ source: 'slot', memberId: '', cardId: 'c1', slotIndex: 0 }),
      ),
    ).toBeNull();
  });

  it('normaliza slotIndex inválido para 0', () => {
    const raw = JSON.stringify({ source: 'slot', memberId: 'm1', cardId: 'c1' });
    expect(parseAssigneeDragPayload(raw)).toEqual({
      source: 'slot',
      memberId: 'm1',
      cardId: 'c1',
      slotIndex: 0,
    });
  });

  it('devolve null para JSON inválido', () => {
    expect(parseAssigneeDragPayload('not json')).toBeNull();
  });
});
