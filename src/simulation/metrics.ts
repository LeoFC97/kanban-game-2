import type { ColumnId, DayLog } from './types';
import { COLUMN_ORDER } from './types';

export type CfdRow = {
  globalDay: number;
  sprint: number;
  dayInSprint: number;
  ceremony: string;
} & Record<ColumnId, number>;

export function buildCfdSeries(logs: DayLog[]): CfdRow[] {
  return logs.map((l) => {
    const row = {
      globalDay: l.globalDay,
      sprint: l.sprint,
      dayInSprint: l.dayInSprint,
      ceremony: l.ceremony,
      backlog: 0,
      ready: 0,
      analise: 0,
      dev: 0,
      teste: 0,
      deploy: 0,
    } as CfdRow;
    for (const c of COLUMN_ORDER) {
      row[c] = l.columnCounts[c];
    }
    return row;
  });
}
