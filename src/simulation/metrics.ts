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
    } as CfdRow;
    for (const c of COLUMN_ORDER) {
      row[c] = l.columnCounts[c];
    }
    return row;
  });
}
