import { useEffect, useMemo, useState } from 'react';
import type { BoardCard, ColumnId } from '../simulation/types';
import {
  WORK_FILL_MS_PER_BLOCK,
  blockCountForStage,
  buildStageBlockFilledMask,
  completedWorkFraction,
} from '../simulation/cardProgress';

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
  const [revealedNewBlocks, setRevealedNewBlocks] = useState(0);

  // #32: targetFrac só é usado no caminho sem pulse — calculado lazy no displayMask.
  // Mantemos uma referência única aqui para passar a buildStageBlockFilledMask.

  // #30: para a máscara "antes do pulse", o bit de deploy deve vir só da fração
  // (não da `columnId` atual). Se o cartão acabou de chegar em Deploy neste step,
  // `columnId === 'deploy'` mas `pulse.from < 1` — passando uma coluna não-deploy
  // como "âncora" para o cálculo, o bit de deploy fica `f >= 1 - 1e-9` corretamente.
  const startMaskWhenPulse = useMemo(() => {
    if (!pulse || card.points <= 0) return null;
    return buildStageBlockFilledMask(card, 'analise', pulse.from);
  }, [pulse, card]);

  const newBlockIndices = useMemo(() => {
    if (!pulse || card.points <= 0) return [] as number[];
    const startMask = buildStageBlockFilledMask(card, 'analise', pulse.from);
    const endMask = buildStageBlockFilledMask(card, columnId, pulse.to);
    const out: number[] = [];
    for (let i = 0; i < endMask.length; i++) {
      if (endMask[i] && !startMask[i]) out.push(i);
    }
    return out;
  }, [pulse, card, columnId]);

  useEffect(() => {
    if (!pulse || card.points <= 0) {
      setRevealedNewBlocks(0);
      return;
    }
    if (newBlockIndices.length === 0) {
      setRevealedNewBlocks(0);
      return;
    }

    setRevealedNewBlocks(0);
    let cancelled = false;
    let raf = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      if (cancelled) return;
      const n = Math.min(newBlockIndices.length, Math.floor((now - t0) / WORK_FILL_MS_PER_BLOCK));
      setRevealedNewBlocks(n);
      if (n < newBlockIndices.length) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      setRevealedNewBlocks(0);
    };
  }, [pulse, pulse?.from, pulse?.to, newBlockIndices, card.points]);

  const displayMask = useMemo(() => {
    if (card.points <= 0) return [] as boolean[];
    if (!pulse) {
      // #32: só calcula a fração quando não há pulse animando o passo do dia.
      const targetFrac = completedWorkFraction(card, columnId, card.remainingInStage);
      return buildStageBlockFilledMask(card, columnId, targetFrac);
    }
    const startMask = buildStageBlockFilledMask(card, 'analise', pulse.from);
    const m = [...startMask];
    for (let k = 0; k < revealedNewBlocks; k++) {
      const ix = newBlockIndices[k];
      if (ix !== undefined) m[ix] = true;
    }
    return m;
  }, [card, columnId, pulse, newBlockIndices, revealedNewBlocks]);

  if (card.points <= 0) return null;

  const nA = blockCountForStage(card.workAnalise);
  const nD = blockCountForStage(card.workDev);
  const nT = blockCountForStage(card.workTeste);
  const nDep = 1;

  const rows: { key: StageKey; count: number }[] = [
    { key: 'analysis', count: nA },
    { key: 'dev', count: nD },
    { key: 'test', count: nT },
    { key: 'deploy', count: nDep },
  ];

  let gi = 0;

  return (
    <div className="card-task-stages" aria-hidden>
      {rows.map((row) => (
        <div key={row.key} className="card-task-stage-row">
          {Array.from({ length: row.count }, (_, j) => {
            const idx = gi++;
            const filled = displayMask[idx] ?? false;
            const wasFilledStart = startMaskWhenPulse ? (startMaskWhenPulse[idx] ?? false) : false;
            const isNewFill = Boolean(pulse && filled && startMaskWhenPulse && !wasFilledStart);
            // #33: a key inclui `filled` deliberadamente para forçar remount do <span>
            // quando o bloco passa de vazio → preenchido, re-disparando a animação CSS
            // `card-task-block-new-fill`. Não use uma key estável aqui sem revisar o CSS.
            return (
              <span
                key={`${row.key}-${j}-${filled ? 1 : 0}`}
                className={`card-task-block ${stageVariant(row.key)}${filled ? ' card-task-block-filled' : ''}${isNewFill ? ' card-task-block-new-fill' : ''}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
