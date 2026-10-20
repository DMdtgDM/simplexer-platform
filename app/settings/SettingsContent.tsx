'use client';

import { useTheme } from '@/components/ThemeProvider';
import { useLocale } from '@/components/LocaleProvider';
import { Sun, Moon, Monitor, Check } from 'lucide-react';

const THEME_OPTIONS = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor },
] as const;

export function SettingsContent() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();

  return (
    <div className="pt-4 pb-10">
      <h1 className="font-heading text-2xl font-bold text-textneutral">Settings</h1>

      <section className="mt-6">
        <h2 className="mb-2 font-heading text-sm font-bold text-textneutral">Appearance</h2>
        <p className="mb-3 text-xs text-gray-500">Choose how Simplexer looks on this device.</p>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium sm:p-4 sm:text-sm transition-colors ${
                theme === key
                  ? 'border-primary bg-primary-50 text-primary dark:bg-primary/10'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {theme === key && <Check size={14} className="absolute right-2 top-2" />}
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-heading text-sm font-bold text-textneutral">Language</h2>
        <p className="mb-3 text-xs text-gray-500">
          Changes the site's menus and buttons. Lesson content stays as originally written.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setLocale('en')}
            className={`rounded-xl border p-4 text-sm font-medium ${
              locale === 'en' ? 'border-primary bg-primary-50 text-primary dark:bg-primary/10' : 'border-gray-200 text-gray-500'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLocale('am')}
            className={`rounded-xl border p-4 font-heading text-sm font-medium ${
              locale === 'am' ? 'border-primary bg-primary-50 text-primary dark:bg-primary/10' : 'border-gray-200 text-gray-500'
            }`}
          >
            አማርኛ
          </button>
        </div>
      </section>
    </div>
  );
}
