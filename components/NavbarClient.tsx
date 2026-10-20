'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bell, ChevronDown, User, LogOut, Menu, X } from 'lucide-react';
import { useLocale } from './LocaleProvider';
import LanguageToggle from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { createClient } from '@/lib/supabase/client';

type Auth = { ready: boolean; loggedIn: boolean; role: string | null; unread: number };

export function NavbarClient() {
  const { t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [auth, setAuth] = useState<Auth>({ ready: false, loggedIn: false, role: null, unread: 0 });
  const [menu, setMenu] = useState<'more' | 'user' | 'nav' | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setMenu(null), [pathname]);
  useEffect(() => {
    // Re-count the bell on every navigation: opening notifications must
    // shrink the badge without a manual refresh.
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id;
      if (!uid) return;
      const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('is_read', false);
      setAuth((a) => (a.loggedIn ? { ...a, unread: count ?? 0 } : a));
    });
  }, [pathname]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setMenu(null); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    async function load(uid: string | null) {
      if (!uid) return alive && setAuth({ ready: true, loggedIn: false, role: null, unread: 0 });
      let role: string | null = null;
      try {
        const [r, at] = (sessionStorage.getItem('sx_role_' + uid) ?? '|0').split('|');
        if (r && Date.now() - Number(at) < 300000) role = r;
      } catch {}
      let unread = 0;
      const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('is_read', false);
      unread = count ?? 0;
      if (alive) setAuth({ ready: true, loggedIn: true, role, unread });
      if (!role) {
        const { data } = await supabase.from('users').select('role').eq('id', uid).maybeSingle();
        role = data?.role ?? 'student';
        try { sessionStorage.setItem('sx_role_' + uid, `${role}|${Date.now()}`); } catch {}
        if (alive) setAuth((a) => ({ ...a, ready: true, loggedIn: true, role }));
      }
    }
    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => load(session?.user.id ?? null));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const { loggedIn, role, ready, unread } = auth;
  const isStaff = role === 'teacher' || role === 'admin';
  const on = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href + '/'));

  const Top = ({ href, children }: { href: string; children: ReactNode }) => (
    <Link href={href} aria-current={on(href) ? 'page' : undefined}
      className={`relative whitespace-nowrap rounded-lg px-2 py-2 text-sm transition-colors xl:px-3 ${on(href) ? 'bg-primary-50 font-bold text-primary' : 'font-medium text-textneutral hover:bg-gray-50 hover:text-primary dark:hover:bg-gray-900'}`}>
      {children}
      {on(href) && <span className="absolute inset-x-3 -bottom-[13px] h-[3px] rounded-full bg-primary" />}
    </Link>
  );
  const Item = ({ href, children }: { href: string; children: ReactNode }) => (
    <Link href={href} className={`block rounded-lg px-3 py-2 text-sm ${on(href) ? 'bg-primary-50 font-bold text-primary' : 'text-textneutral hover:bg-gray-50 dark:hover:bg-gray-800'}`}>{children}</Link>
  );
  const Pop = ({ children, wide }: { children: ReactNode; wide?: boolean }) => (
    <div className={`absolute right-0 top-full z-50 mt-3 ${wide ? 'w-56' : 'w-48'} rounded-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-800 dark:bg-gray-900`}>{children}</div>
  );

  async function logout() {
    await createClient().auth.signOut();
    try { sessionStorage.clear(); } catch {}
    router.push('/'); router.refresh();
  }

  return (
    <div ref={box} className="flex flex-1 items-center justify-between gap-2 lg:gap-4">
      {/* Compact menu for phones AND tablets: the full link row only fits
          honestly at desktop width (lg, 1024px+). Below that it crowded the
          bar and wrapped — this button replaces it. */}
      <div className="relative lg:hidden">
        <button type="button" onClick={() => setMenu(menu === 'nav' ? null : 'nav')} aria-expanded={menu === 'nav'} aria-label="Menu"
          className="grid h-10 w-10 place-items-center rounded-full bg-primary-50 text-primary hover:bg-primary hover:text-white">
          {menu === 'nav' ? <X size={19} /> : <Menu size={19} />}
        </button>
        {menu === 'nav' && (
          <div className="absolute left-0 top-full z-50 mt-3 max-h-[75vh] w-60 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <Item href="/formal">{t('formalTrack')}</Item>
            <Item href="/interests">{t('interestTrack')}</Item>
            <Item href="/tutors">{t('tutorsNav')}</Item>
            <Item href="/jobs">{t('jobs')}</Item>
            <Item href="/competitions">{t('compete')}</Item>
            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
            <Item href="/community">{t('telegram')}</Item>
            <Item href="/requests">{t('myRequests')}</Item>
            <Item href="/tutor">{t('becomeTutor')}</Item>
            <Item href="/notifications">{t('notifications')}</Item>
            {isStaff && <Item href="/teach">{t('teach')}</Item>}
            <div className="my-1 border-t border-gray-100 px-3 py-2 dark:border-gray-800">
              <LanguageToggle />
            </div>
          </div>
        )}
      </div>

      <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
        <Top href="/formal">{t('formalTrack')}</Top>
        <Top href="/interests">{t('interestTrack')}</Top>
        <Top href="/tutors">{t('tutorsNav')}</Top>
        <Top href="/jobs">{t('jobs')}</Top>
        <Top href="/competitions">{t('compete')}</Top>
        <div className="relative">
          <button type="button" onClick={() => setMenu(menu === 'more' ? null : 'more')} aria-expanded={menu === 'more'}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-textneutral hover:bg-gray-50 hover:text-primary dark:hover:bg-gray-900">
            {t('more')} <ChevronDown size={14} />
          </button>
          {menu === 'more' && <Pop><Item href="/community">{t('telegram')}</Item><Item href="/requests">{t('myRequests')}</Item><Item href="/tutor">{t('becomeTutor')}</Item><Item href="/notifications">{t('notifications')}</Item></Pop>}
        </div>
      </nav>

      <div className="ml-auto flex items-center gap-2 lg:gap-3">
        {loggedIn && (
          <Link href="/notifications" aria-label={t('notifications')} className="relative grid h-10 w-10 place-items-center rounded-full bg-primary-50 text-primary hover:bg-primary hover:text-white">
            <Bell size={18} />
            {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>}
          </Link>
        )}
        {isStaff && <Link href="/teach" className={`hidden rounded-full px-4 py-2 text-sm font-semibold lg:block ${on('/teach') ? 'bg-primary text-white' : 'bg-primary-50 text-primary hover:bg-primary hover:text-white'}`}>{t('teach')}</Link>}
        <ThemeToggle />
        <LanguageToggle className="hidden lg:inline-flex" />
        {!ready ? <span className="h-10 w-10" aria-hidden /> : loggedIn ? (
          <div className="relative">
            <button type="button" onClick={() => setMenu(menu === 'user' ? null : 'user')} aria-label="Account menu" aria-expanded={menu === 'user'}
              className={`grid h-10 w-10 place-items-center rounded-full ${on('/profile') || menu === 'user' ? 'bg-primary text-white' : 'bg-primary-50 text-primary'}`}>
              <User size={19} />
            </button>
            {menu === 'user' && (
              <Pop wide>
                <Item href="/profile">{t('myProfile')}</Item>
                <Item href="/requests">{t('myRequests')}</Item>
                <Item href="/tutor">{t('tutorProfile')}</Item>
                {isStaff && <Item href="/teach">{t('teach')}</Item>}
                {role === 'admin' && (<><div className="my-1 border-t border-gray-100 dark:border-gray-800" /><Item href="/admin">{t('admin')}</Item><Item href="/admin/review">{t('reviewQueue')}</Item><Item href="/admin/structure">{t('gradesSubjects')}</Item></>)}
                <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-gray-800"><LogOut size={15} /> {t('logout')}</button>
              </Pop>
            )}
          </div>
        ) : (
          <Link href="/login" className="shrink-0 whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark sm:px-5 sm:py-2.5">{t('login')}</Link>
        )}
      </div>
    </div>
  );
}
