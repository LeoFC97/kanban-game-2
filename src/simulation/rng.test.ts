import { describe, expect, it } from 'vitest';
import { createRng, rollIntInclusive } from './rng';

describe('createRng', () => {
  it('produz a mesma sequência para a mesma semente', () => {
    const a = createRng(42_424_242);
    const b = createRng(42_424_242);
    const xs = Array.from({ length: 20 }, () => a.next());
    const ys = Array.from({ length: 20 }, () => b.next());
    expect(xs).toEqual(ys);
  });

  it('produz sequências diferentes para sementes diferentes', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toBe(b.next());
  });
});

describe('rollIntInclusive', () => {
  it('respeita limites inclusive', () => {
    const rng = createRng(99);
    for (let i = 0; i < 200; i++) {
      const v = rollIntInclusive(rng, 3, 8);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(8);
    }
  });

  it('com max < min devolve min', () => {
    const rng = createRng(1);
    expect(rollIntInclusive(rng, 5, 2)).toBe(5);
  });
});
