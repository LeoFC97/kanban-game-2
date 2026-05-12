import { describe, expect, it } from 'vitest';
import { clamp, directedKey, pairKey } from './synergy';

describe('pairKey', () => {
  it('é independente da ordem dos ids', () => {
    expect(pairKey('ana', 'bru')).toBe(pairKey('bru', 'ana'));
    expect(pairKey('ana', 'bru')).toBe('ana|bru');
  });
});

describe('directedKey', () => {
  it('preserva a direção', () => {
    expect(directedKey('a', 'b')).toBe('a>>b');
    expect(directedKey('a', 'b')).not.toBe(directedKey('b', 'a'));
  });
});

describe('clamp', () => {
  it('corta nos limites', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});
