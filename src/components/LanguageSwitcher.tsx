import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { LANG_STORAGE_KEY, supportedLanguages, type AppLanguage } from '../i18n/storage';

export function LanguageSwitcher() {
  const { t } = useTranslation();

  return (
    <label className="lang-switcher">
      <span className="lang-label">{t('nav.language')}</span>
      <select
        className="input lang-select"
        value={(supportedLanguages as readonly string[]).includes(i18n.language) ? i18n.language : 'pt-BR'}
        onChange={(e) => {
          const lng = e.target.value as AppLanguage;
          void i18n.changeLanguage(lng);
          try {
            localStorage.setItem(LANG_STORAGE_KEY, lng);
          } catch {
            /* ignore */
          }
        }}
      >
        {supportedLanguages.map((lng) => (
          <option key={lng} value={lng}>
            {t(`languages.${lng}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
