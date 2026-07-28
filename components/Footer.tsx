'use client';

import Link from 'next/link';
import LanguageToggle from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { useLocale } from './LocaleProvider';

export function Footer() {
  const { t } = useLocale();

  return (
    <footer className="mb-14 mt-12 border-t border-gray-100 bg-white px-4 py-8 dark:border-gray-800 dark:bg-gray-900 sm:mb-0">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center text-sm text-gray-500 dark:text-gray-400 sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="font-heading font-bold text-primary">Simplexer</p>
          <p className="mt-1 text-xs">{t('tagline')}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          <Link href="/about" className="hover:text-primary">{t('about')}</Link>
          <Link href="/community" className="hover:text-primary">{t('telegram')}</Link>
          <span>hello@simplexer.et</span>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
      <p className="mt-6 text-center text-[11px] text-gray-400 dark:text-gray-600">
        © {new Date().getFullYear()} Simplexer. All rights reserved.
      </p>
    </footer>
  );
}
