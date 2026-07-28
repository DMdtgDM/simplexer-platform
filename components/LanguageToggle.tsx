'use client';

import { useLocale } from './LocaleProvider';

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div className={`inline-flex items-center rounded-full border border-gray-200 bg-white p-0.5 text-xs font-medium dark:border-gray-700 dark:bg-gray-900 ${className}`}>
      <button
        onClick={() => setLocale('en')}
        className={`rounded-full px-2.5 py-1 transition-colors ${
          locale === 'en' ? 'bg-primary text-white' : 'text-gray-500 dark:text-gray-400'
        }`}
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
      <button
        onClick={() => setLocale('am')}
        className={`rounded-full px-2.5 py-1 font-heading transition-colors ${
          locale === 'am' ? 'bg-primary text-white' : 'text-gray-500 dark:text-gray-400'
        }`}
        aria-pressed={locale === 'am'}
      >
        አማ
      </button>
    </div>
  );
}
