import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

// Only initialize if we're on the client side
if (typeof window !== 'undefined') {
  i18n
    .use(HttpApi)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      lng: 'he', // Set Hebrew as the default language
      fallbackLng: 'he',
      supportedLngs: ['en', 'he'],
      debug: process.env.NODE_ENV === 'development',

      interpolation: {
        escapeValue: false,
      },

      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json',
      },

      ns: ['common'],
      defaultNS: 'common',

      detection: {
        order: ['querystring', 'cookie', 'localStorage', 'htmlTag', 'navigator'],
        caches: ['localStorage', 'cookie'],
      },

      react: {
        useSuspense: false, // Disable suspense to prevent hydration issues
      },
    });
} else {
  // Server-side: minimal initialization
  i18n.use(initReactI18next).init({
    lng: 'he',
    fallbackLng: 'he',
    resources: {
      he: { common: {} },
      en: { common: {} },
    },
    react: {
      useSuspense: false,
    },
  });
}

export default i18n;
