'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, GraduationCap, Compass, User } from 'lucide-react';
import { useLocale } from './LocaleProvider';

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  const items = [
    { href: '/', label: t('home'), icon: Home },
    { href: '/formal', label: t('formalTrack').split(' ')[0], icon: GraduationCap },
    { href: '/interests', label: t('interestTrack').split(' ')[0], icon: Compass },
    { href: '/profile', label: t('profile'), icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 sm:hidden">
      <div className="flex items-stretch justify-around">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                active ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
