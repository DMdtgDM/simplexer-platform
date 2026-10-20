'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ButtonLink, Button } from '@/components/Button';
import { useLocale } from '@/components/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { ExamCountdownBanner } from '@/components/ExamCountdownBanner';
import { BookOpen, ClipboardCheck, LogOut, User as UserIcon, Flame, Bookmark } from 'lucide-react';
import type { QuizAttempt, UserProfile } from '@/lib/types';
import type { StreakInfo } from '@/lib/queries/activity';

export function ProfileContent({
  profile,
  email,
  gradeName,
  examDate,
  completedLessons,
  quizAttempts,
  streak,
}: {
  profile: UserProfile | null;
  email: string;
  gradeName: string | null;
  examDate: string | null;
  completedLessons: number;
  quizAttempts: QuizAttempt[];
  streak: StreakInfo;
}) {
  const { t } = useLocale();
  const router = useRouter();

  // Signup account-type routing: a parent/tutor who signed up with
  // Google, or confirmed their email before logging in, lands here
  // first — send them where they chose to go, exactly once.
  useEffect(() => {
    let intent: string | null = null;
    try {
      intent = localStorage.getItem('sx_intent');
      if (intent) localStorage.removeItem('sx_intent');
    } catch { /* private mode */ }
    if (intent === 'tutor') router.push('/tutor');
    else if (intent === 'parent') router.push('/requests');
  }, [router]);

  const avgScore =
    quizAttempts.length > 0
      ? Math.round(
          (quizAttempts.reduce((sum, a) => sum + a.score / a.total, 0) / quizAttempts.length) * 100
        )
      : null;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="pt-4">
      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 text-white shadow-card">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 font-heading text-xl font-bold ring-2 ring-white/30">
          {(profile?.name?.trim()?.[0] ?? '').toUpperCase() || <UserIcon size={26} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-lg font-bold">{profile?.name || 'Student'}</p>
          <p className="truncate text-xs text-white/70">{email}</p>
          {gradeName && <p className="mt-1.5 inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold">{gradeName}</p>}
        </div>
      </div>

      <ExamCountdownBanner examDate={examDate} />

      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-3 text-center shadow-card sm:p-4">
          <BookOpen size={20} className="mx-auto text-primary" />
          <p className="mt-2 font-heading text-xl font-bold text-textneutral sm:text-2xl">{completedLessons}</p>
          <p className="text-xs text-gray-500">Lessons completed</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-3 text-center shadow-card sm:p-4">
          <ClipboardCheck size={20} className="mx-auto text-secondary-dark" />
          <p className="mt-2 font-heading text-xl font-bold text-textneutral sm:text-2xl">
            {avgScore !== null ? `${avgScore}%` : '—'}
          </p>
          <p className="text-xs text-gray-500">Avg. quiz score</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-3 text-center shadow-card sm:p-4">
          <Flame size={20} className={`mx-auto ${streak.current > 0 ? 'text-secondary' : 'text-gray-300'}`} />
          <p className="mt-2 font-heading text-xl font-bold text-textneutral sm:text-2xl">{streak.current}</p>
          <p className="text-xs text-gray-500">Day streak{streak.longest > streak.current ? ` (best ${streak.longest})` : ''}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <ButtonLink href="/profile/progress" variant="outline">
          View full progress
        </ButtonLink>
        <ButtonLink href="/settings" variant="outline">
          Settings
        </ButtonLink>
        <ButtonLink href="/profile/bookmarks" variant="outline" className="gap-2">
          <Bookmark size={16} />
          Saved lessons
        </ButtonLink>
        {(profile?.role === 'teacher' || profile?.role === 'admin') && (
          <ButtonLink href="/teach" variant="outline">
            Teach a course
          </ButtonLink>
        )}
        {profile?.role === 'admin' && (
          <ButtonLink href="/admin" variant="outline">
            Admin dashboard
          </ButtonLink>
        )}
        <Button variant="ghost" onClick={handleLogout} className="justify-start gap-2">
          <LogOut size={16} />
          {t('logout')}
        </Button>
      </div>
    </div>
  );
}
