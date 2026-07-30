import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/hi';

import en from './locales/en.json';
import hi from './locales/hi.json';

export const SUPPORTED_LANGS = ['en', 'hi'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGS)[number];

const STORAGE_KEY = 'medibook_lang';

function applyDocumentLang(lng: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng === 'hi' ? 'hi' : 'en';
  }
  dayjs.locale(lng === 'hi' ? 'hi' : 'en');
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
    },
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LANGS],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
  })
  .then(() => {
    applyDocumentLang(i18n.language?.startsWith('hi') ? 'hi' : 'en');
  });

i18n.on('languageChanged', (lng) => {
  const normalized = lng?.startsWith('hi') ? 'hi' : 'en';
  applyDocumentLang(normalized);
  try {
    localStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    /* ignore */
  }
});

export function changeAppLanguage(lng: AppLanguage) {
  return i18n.changeLanguage(lng);
}

/** Map API status enums to translated labels. */
export function tStatus(t: (key: string) => string, status?: string | null): string {
  if (!status) return '';
  const key = `status.${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
}

export default i18n;
