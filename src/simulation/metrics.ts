import type { ColumnId, DayLog } from './types';
import { COLUMN_ORDER } from './types';

export type CfdRow = {
  globalDay: number;
  sprint: number;
  dayInSprint: number;
  ceremony: string;
} & Record<ColumnId, number>;

/**
 * Série de contagens por coluna ao longo dos dias (snapshot ao fim de cada dia útil).
 *
 * No fluxo deste motor (apenas avanço, sem retorno e sem novos cartões durante a partida),
 * empilhar esses valores de Deploy → Backlog (bottom→top) reproduz um Diagrama de Fluxo
 * Cumulativo canônico: a banda inferior (Deploy) é monotonicamente não-decrescente e
 * representa cartões já entregues; cada banda acima soma os cartões que já atingiram
 * pelo menos aquele estágio. O componente {@link CfdChart} renderiza nessa ordem.
 *
 * Use {@link buildCumulativeFlowSeries} quando precisar dos valores cumulativos
 * explícitos (por exemplo, plot não-empilhado).
 */
export function buildCfdSeries(logs: DayLog[]): CfdRow[] {
  return logs.map((l) => {
    const row = {
      globalDay: l.globalDay,
      sprint: l.sprint,
      dayInSprint: l.dayInSprint,
      ceremony: l.ceremony,
    } as CfdRow;
    for (const c of COLUMN_ORDER) {
      row[c] = l.columnCounts[c];
    }
    return row;
  });
}

/**
 * Cumulativos não-decrescentes por estágio: para cada dia, `row[col]` é o número de
 * cartões que **já atingiram pelo menos** aquele estágio. Útil para plotar um CFD
 * como áreas/linhas sobrepostas (sem stack). Pressupõe fluxo forward-only.
 */
export function buildCumulativeFlowSeries(logs: DayLog[]): CfdRow[] {
  return logs.map((l) => {
    const row = {
      globalDay: l.globalDay,
      sprint: l.sprint,
      dayInSprint: l.dayInSprint,
      ceremony: l.ceremony,
    } as CfdRow;
    let cum = 0;
    // Caminhar de Deploy para Backlog acumulando: `cum` em Deploy = count(Deploy).
    // Em Teste = count(Teste) + count(Deploy), etc.
    for (let i = COLUMN_ORDER.length - 1; i >= 0; i--) {
      const c = COLUMN_ORDER[i]!;
      cum += l.columnCounts[c];
      row[c] = cum;
    }
    return row;
  });
}
