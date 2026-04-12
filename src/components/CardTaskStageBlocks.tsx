import { useEffect, useState } from 'react';
import type { BoardCard, ColumnId } from '../simulation/types';
import {
  blockCountForStage,
  completedWorkFraction,
  filledBlocksInRow,
  sequentialConsumedAtFraction,
} from '../simulation/cardProgress';

const ANIM_MS = 720;

type Pulse = { from: number; to: number };

type Props = {
  card: BoardCard;
  columnId: ColumnId;
  pulse?: Pulse | null;
};

type StageKey = 'analysis' | 'dev' | 'test' | 'deploy';

function stageVariant(key: StageKey): string {
  switch (key) {
    case 'analysis':
      return 'card-task-block--analysis';
    case 'dev':
      return 'card-task-block--dev';
    case 'test':
      return 'card-task-block--test';
    case 'deploy':
      return 'card-task-block--deploy';
    default:
      return '';
  }
}

export function CardTaskStageBlocks({ card, columnId, pulse }: Props) {
  const targetFrac =
    card.points <= 0 ? 0 : completedWorkFraction(card, columnId, card.remainingInStage);
  const [animFrac, setAnimFrac] = useState<number | null>(null);

  useEffect(() => {
    if (!pulse) return;
    let cancelled = false;
    const rafRef = { id: 0 };
    const start = performance.now();
    const from = pulse.from;
    const delta = pulse.to - pulse.from;

    const tick = (now: number) => {
      if (cancelled) return;
      const u = Math.min(1, (now - start) / ANIM_MS);
      const ease = 1 - (1 - u) * (1 - u);
      setAnimFrac(from + delta * ease);
      if (u < 1) rafRef.id = requestAnimationFrame(tick);
    };
    rafRef.id = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.id);
      setAnimFrac(null);
    };
  }, [pulse, pulse?.from, pulse?.to]);

  const displayFrac = pulse != null ? (animFrac ?? pulse.from) : targetFrac;

  if (card.points <= 0) return null;

  const nA = blockCountForStage(card.workAnalise);
  const nD = blockCountForStage(card.workDev);
  const nT = blockCountForStage(card.workTeste);
  const nDep = 1;

  const seq = sequentialConsumedAtFraction(card, displayFrac);
  const filledA = filledBlocksInRow(seq.analysis, card.workAnalise, nA);
  const filledD = filledBlocksInRow(seq.dev, card.workDev, nD);
  const filledT = filledBlocksInRow(seq.test, card.workTeste, nT);
  const deployFilled = displayFrac >= 1 - 1e-9 || columnId === 'deploy';

  const rows: { key: StageKey; count: number; filled: number }[] = [
    { key: 'analysis', count: nA, filled: filledA },
    { key: 'dev', count: nD, filled: filledD },
    { key: 'test', count: nT, filled: filledT },
    { key: 'deploy', count: nDep, filled: deployFilled ? 1 : 0 },
  ];

  let slotBase = 0;

  return (
    <div className="card-task-stages" aria-hidden>
      {rows.map((row) => {
        const base = slotBase;
        slotBase += row.count;
        return (
          <div key={row.key} className="card-task-stage-row">
            {Array.from({ length: row.count }, (_, j) => {
              const gi = base + j;
              const filled = j < row.filled;
              return (
                <span
                  key={`${row.key}-${j}`}
                  className={`card-task-block ${stageVariant(row.key)}${filled ? ' card-task-block-filled' : ''}`}
                  style={{ ['--gi' as string]: gi }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
