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
    if (stored === 'en' || stored === 'am') setLocaleState(stored);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem('simplexer_locale', l);
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
