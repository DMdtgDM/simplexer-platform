'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

type ThemeContextType = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextType | null>(null);

function applyTheme(theme: Theme) {
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'dark' || (theme === 'system' && systemDark);
  document.documentElement.classList.toggle('dark', dark);
  return dark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = window.localStorage.getItem('simplexer_theme') as Theme | null;
    const initial = stored ?? 'system';
    setThemeState(initial);
    setResolvedTheme(applyTheme(initial));

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      const current = (window.localStorage.getItem('simplexer_theme') as Theme | null) ?? 'system';
      if (current === 'system') setResolvedTheme(applyTheme('system'));
    };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    window.localStorage.setItem('simplexer_theme', t);
    setResolvedTheme(applyTheme(t));
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
