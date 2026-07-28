'use client';

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
      <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
          <UserIcon size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-lg font-bold text-textneutral">{profile?.name || 'Student'}</p>
          <p className="truncate text-xs text-gray-500">{email}</p>
          {gradeName && <p className="mt-1 text-xs font-medium text-primary">{gradeName}</p>}
        </div>
      </div>

      <ExamCountdownBanner examDate={examDate} />

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-card">
          <BookOpen size={20} className="mx-auto text-primary" />
          <p className="mt-2 font-heading text-2xl font-bold text-textneutral">{completedLessons}</p>
          <p className="text-xs text-gray-500">Lessons completed</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-card">
          <ClipboardCheck size={20} className="mx-auto text-secondary-dark" />
          <p className="mt-2 font-heading text-2xl font-bold text-textneutral">
            {avgScore !== null ? `${avgScore}%` : '—'}
          </p>
          <p className="text-xs text-gray-500">Avg. quiz score</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-card">
          <Flame size={20} className={`mx-auto ${streak.current > 0 ? 'text-secondary' : 'text-gray-300'}`} />
          <p className="mt-2 font-heading text-2xl font-bold text-textneutral">{streak.current}</p>
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
