'use client';

import Link from 'next/link';
import LanguageToggle from './LanguageToggle';
import { useLocale } from './LocaleProvider';

const col = 'space-y-2 text-sm text-gray-500 dark:text-gray-400';
const h = 'mb-3 font-heading text-sm font-bold text-textneutral';

export function Footer() {
  const { t } = useLocale();
  return (
    <footer className="mb-14 mt-12 border-t border-gray-100 bg-white px-4 pb-8 pt-8 dark:border-gray-800 dark:bg-gray-900 sm:mb-0">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-heading text-2xl font-extrabold tracking-tight text-primary">Simplexer</p>
          <p className="mt-2 max-w-xs text-sm text-gray-500 dark:text-gray-400">{t('tagline')}</p>
          <div className="mt-4 flex items-center gap-3"><LanguageToggle /></div>
        </div>
        <div><p className={h}>{t('learnHeading')}</p><ul className={col}><li><Link href="/formal" className="hover:text-primary">{t('formalTrack')}</Link></li><li><Link href="/interests" className="hover:text-primary">{t('interestTrack')}</Link></li><li><Link href="/competitions" className="hover:text-primary">{t('compete')}</Link></li></ul></div>
        <div><p className={h}>{t('footerTutoring')}</p><ul className={col}><li><Link href="/tutors" className="hover:text-primary">{t('findTutorLink')}</Link></li><li><Link href="/requests" className="hover:text-primary">{t('sendRequestLink')}</Link></li><li><Link href="/tutor" className="hover:text-primary">{t('becomeTutor')}</Link></li><li><Link href="/jobs" className="hover:text-primary">{t('jobs')}</Link></li></ul></div>
        <div><p className={h}>Simplexer</p><ul className={col}><li><Link href="/about" className="hover:text-primary">{t('about')}</Link></li><li><Link href="/community" className="hover:text-primary">{t('telegram')}</Link></li><li><Link href="/teach" className="hover:text-primary">{t('teachWithUs')}</Link></li><li>hello@simplexer.et</li></ul></div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl border-t border-gray-100 pt-5 text-center text-xs text-gray-400 dark:border-gray-800">© {new Date().getFullYear()} Simplexer. {t('allRightsReserved')}</p>
    </footer>
  );
}
