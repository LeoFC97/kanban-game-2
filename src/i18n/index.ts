import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptBR from '../locales/pt-BR.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import {
  getStoredLanguage,
  LANG_STORAGE_KEY,
  supportedLanguages,
  type AppLanguage,
} from './storage';

export { getStoredLanguage, LANG_STORAGE_KEY, supportedLanguages, type AppLanguage };

void i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en },
    es: { translation: es },
  },
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
