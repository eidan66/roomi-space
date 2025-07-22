'use client';

import { useEffect } from 'react';

import { useTranslation } from 'react-i18next';

const RTL_LANGUAGES = ['he', 'ar', 'fa'];

export default function LanguageEffect() {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Only run on client side after hydration
    if (typeof document !== 'undefined') {
      const fallbackLng = i18n.options.fallbackLng;
      const defaultLang = Array.isArray(fallbackLng)
        ? fallbackLng[0]
        : fallbackLng || 'he';
      const currentLang = i18n.language || defaultLang;
      const isRTL = RTL_LANGUAGES.includes(currentLang);

      // Set initial language and direction
      document.documentElement.lang = currentLang;
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    }
  }, [i18n.language, i18n.options.fallbackLng]); // Include dependencies

  return null;
}
