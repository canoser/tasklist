import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_TONE } from './config/featureFlags';
import storage from './utils/storage';

const SUPPORTED_LANGS = ['tr', 'en', 'es', 'fr', 'de', 'ro'];

export const detectInitialLanguage = () => {
  const savedLang = storage.getString('planlama_lang');
  if (savedLang && SUPPORTED_LANGS.includes(savedLang)) {
    return savedLang;
  }

  const browserLang = (typeof navigator !== 'undefined' && (navigator.language || navigator.userLanguage) || '').split('-')[0].toLowerCase();
  if (SUPPORTED_LANGS.includes(browserLang)) {
    return browserLang;
  }

  return 'en';
};

// Locale JSON'ları statik import (Vite bundle'a dahil eder)
import trCommon   from './locales/tr/common.json';
import trTasks    from './locales/tr/tasks.json';
import trProfile  from './locales/tr/profile.json';
import trAuth     from './locales/tr/auth.json';
import trAdmin    from './locales/tr/admin.json';

import enCommon   from './locales/en/common.json';
import enTasks    from './locales/en/tasks.json';
import enProfile  from './locales/en/profile.json';
import enAuth     from './locales/en/auth.json';
import enAdmin    from './locales/en/admin.json';

import esCommon   from './locales/es/common.json';
import esTasks    from './locales/es/tasks.json';
import esProfile  from './locales/es/profile.json';
import esAuth     from './locales/es/auth.json';
import esAdmin    from './locales/es/admin.json';

import frCommon   from './locales/fr/common.json';
import frTasks    from './locales/fr/tasks.json';
import frProfile  from './locales/fr/profile.json';
import frAuth     from './locales/fr/auth.json';
import frAdmin    from './locales/fr/admin.json';

import deCommon   from './locales/de/common.json';
import deTasks    from './locales/de/tasks.json';
import deProfile  from './locales/de/profile.json';
import deAuth     from './locales/de/auth.json';
import deAdmin    from './locales/de/admin.json';

import roCommon   from './locales/ro/common.json';
import roTasks    from './locales/ro/tasks.json';
import roProfile  from './locales/ro/profile.json';
import roAuth     from './locales/ro/auth.json';
import roAdmin    from './locales/ro/admin.json';

i18n
  .use(initReactI18next)
  .init({
    lng: detectInitialLanguage(),
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'tasks', 'profile', 'auth', 'admin'],
    resources: {
      tr: { common: trCommon, tasks: trTasks, profile: trProfile, auth: trAuth, admin: trAdmin },
      en: { common: enCommon, tasks: enTasks, profile: enProfile, auth: enAuth, admin: enAdmin },
      es: { common: esCommon, tasks: esTasks, profile: esProfile, auth: esAuth, admin: esAdmin },
      fr: { common: frCommon, tasks: frTasks, profile: frProfile, auth: frAuth, admin: frAdmin },
      de: { common: deCommon, tasks: deTasks, profile: deProfile, auth: deAuth, admin: deAdmin },
      ro: { common: roCommon, tasks: roTasks, profile: roProfile, auth: roAuth, admin: roAdmin },
    },
    // Üslup context'i global olarak sakla
    // Kullanım: t('key', { context: tone }) → 'key_buddy', 'key_semi', 'key_formal'
    interpolation: { escapeValue: false },
  });

// Üslup değiştirme fonksiyonu — Profile sayfasından çağrılır
export const setTone = (tone) => {
  i18n.options.defaultContext = tone === 'formal' ? undefined : tone;
};

export default i18n;
