import type { TFunction } from 'i18next';
import type { ColumnId, LogNote } from '../simulation/types';

export function formatLogNote(t: TFunction, n: LogNote): string {
  const p = n.params;
  if (!p) return t(n.key);

  if (n.key === 'engine.reworkHandoff') {
    return t(n.key, {
      title: String(p.title),
      from: t(`columns.${String(p.fromCol) as ColumnId}`),
      to: t(`columns.${String(p.toCol) as ColumnId}`),
    });
  }

  return t(n.key, p as Record<string, string | number>);
}
