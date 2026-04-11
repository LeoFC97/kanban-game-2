export const LANG_STORAGE_KEY = 'kanban-sinergia-lang';

export const supportedLanguages = ['pt-BR', 'en', 'es'] as const;
export type AppLanguage = (typeof supportedLanguages)[number];

export function getStoredLanguage(): AppLanguage {
  try {
    const s = localStorage.getItem(LANG_STORAGE_KEY);
    if (s && (supportedLanguages as readonly string[]).includes(s)) {
      return s as AppLanguage;
    }
  } catch {
    /* ignore */
  }
  return 'pt-BR';
}
