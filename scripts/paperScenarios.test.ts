import { describe, expect, it } from 'vitest';
import { runSimulation } from '../src/simulation/engine';
import { SCENARIOS } from './paperScenarios';

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

describe('paperScenarios (cenários do artigo)', () => {
  it('cenário A: sete cartões concluídos e média de ciclo alinhada ao export LaTeX', () => {
    const baseline = SCENARIOS.find((s) => s.id === 'A_baseline');
    expect(baseline).toBeDefined();
    const { completed } = runSimulation(baseline!.config);
    expect(completed).toHaveLength(7);
    const ct = completed.map((c) => c.cycleTimeDays);
    expect(mean(ct)).toBeCloseTo(1.86, 2);
  });

  it('todos os cenários A–D terminam com sete conclusões', () => {
    for (const sc of SCENARIOS) {
      const { completed } = runSimulation(sc.config);
      expect(completed, sc.id).toHaveLength(7);
    }
  });
});
