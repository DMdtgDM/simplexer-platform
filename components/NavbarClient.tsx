'use client';

import Link from 'next/link';
import { useLocale } from './LocaleProvider';
import LanguageToggle from './LanguageToggle';
import { User, ShieldCheck, GraduationCap } from 'lucide-react';

export function NavbarClient({ loggedIn, role }: { loggedIn: boolean; role: string | null }) {
  const { t } = useLocale();

  return (
    <nav className="flex items-center gap-4">
      <Link href="/formal" className="hidden text-sm font-medium text-textneutral hover:text-primary sm:block">
        {t('formalTrack')}
      </Link>
      <Link href="/interests" className="hidden text-sm font-medium text-textneutral hover:text-primary sm:block">
        {t('interestTrack')}
      </Link>
      <Link href="/community" className="hidden text-sm font-medium text-textneutral hover:text-primary sm:block">
        {t('telegram')}
      </Link>
      {(role === 'teacher' || role === 'admin') && (
        <Link href="/teach" className="hidden items-center gap-1 text-sm font-medium text-textneutral hover:text-primary sm:flex">
          <GraduationCap size={14} /> Teach
        </Link>
      )}
      {role === 'admin' && (
        <Link href="/admin" className="hidden items-center gap-1 text-sm font-medium text-textneutral hover:text-primary sm:flex">
          <ShieldCheck size={14} /> Admin
        </Link>
      )}
      <LanguageToggle className="hidden sm:inline-flex" />
      {loggedIn ? (
        <Link href="/profile" className="rounded-full bg-primary-50 p-2 text-primary" aria-label={t('profile')}>
          <User size={18} />
        </Link>
      ) : (
        <Link
          href="/login"
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          {t('login')}
        </Link>
      )}
    </nav>
  );
}
