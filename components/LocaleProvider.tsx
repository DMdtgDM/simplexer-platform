'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { dictionary, type DictKey, type Locale } from '@/lib/i18n/dictionary';

type LocaleContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: DictKey) => string;
};

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const stored = window.localStorage.getItem('simplexer_locale') as Locale | null;
    // Fall back to the cookie so client pages agree with server pages even
    // when localStorage was cleared — before this, the server could render
    // Amharic while the client chrome stayed English.
    const fromCookie = document.cookie.match(/(?:^|; )simplexer_locale=(en|am)/)?.[1] as Locale | undefined;
    const initial = stored === 'en' || stored === 'am' ? stored : fromCookie;
    if (initial === 'en' || initial === 'am') {
      setLocaleState(initial);
      document.cookie = `simplexer_locale=${initial}; path=/; max-age=31536000; samesite=lax`;
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem('simplexer_locale', l);
    // Cookie copy so server components (jobs, competitions pages) can render
    // in the same language instead of always falling back to English.
    document.cookie = `simplexer_locale=${l}; path=/; max-age=31536000; samesite=lax`;
  };

  const t = (key: DictKey) => dictionary[locale][key];

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
