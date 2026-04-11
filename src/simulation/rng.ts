/** Mulberry32 — small fast PRNG, deterministic from seed */
export type Rng = { next: () => number };

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next(): number {
      a += 0x6d2b79f5;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export function rollIntInclusive(rng: Rng, min: number, max: number): number {
  if (max < min) return min;
  return min + Math.floor(rng.next() * (max - min + 1));
}
