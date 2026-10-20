import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BookOpen, GraduationCap, Plus } from 'lucide-react';
import { getCurrentUser } from '@/lib/queries/progress';
import { getMySubmittedCourses, getCourseAnalytics } from '@/lib/queries/admin';
import { getLessonCounts, getMySchoolLessons } from '@/lib/queries/teach';
import { createClient } from '@/lib/supabase/server';
import { panel } from '@/components/Form';
import { serverT } from '@/lib/i18n/server';
import type { DictKey } from '@/lib/i18n/dictionary';
import { DeleteCourse } from './DeleteCourse';
import { DeleteLessonButton } from './DeleteLessonButton';

export const metadata = { title: 'Teach — Simplexer' };
export const dynamic = 'force-dynamic';

const STATUS: Record<string, [string, DictKey]> = {
  draft: ['bg-gray-100 text-gray-700', 'draftBadge'], pending: ['bg-yellow-100 text-yellow-800', 'statusInReview'],
  approved: ['bg-green-100 text-green-700', 'statusLiveChip'], rejected: ['bg-red-100 text-red-700', 'statusNeedsChanges'],
};

export default async function TeachPage(props: { searchParams: Promise<{ saved?: string }> }) {
  const searchParams = await props.searchParams;
  const { t } = await serverT();
  const Chip = ({ s }: { s: string }) => {
    const [cls, key] = STATUS[s] ?? STATUS.draft;
    return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>{t(key)}</span>;
  };
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const role = user.profile?.role;
  if (role !== 'teacher' && role !== 'admin') redirect('/profile');
  const uid = user.authUser.id;
  const isAdmin = role === 'admin';

  const supabase = await createClient();
  const [courses, lessons, assigned] = await Promise.all([
    getMySubmittedCourses(uid), getMySchoolLessons(uid),
    isAdmin ? Promise.resolve(null) : supabase.from('teacher_assignments').select('subject_id').eq('teacher_id', uid),
  ]);
  const [counts, stats] = await Promise.all([getLessonCounts(courses.map((c) => c.id)), getCourseAnalytics(courses.filter((c) => c.status === 'approved').map((c) => c.id))]);
  const canSchool = isAdmin || (assigned?.data?.length ?? 0) > 0;
  const byTopic = new Map<string, typeof lessons>();
  lessons.forEach((l) => byTopic.set(l.topic_id, [...(byTopic.get(l.topic_id) ?? []), l]));

  return (
    <div className="pt-6 pb-10">
      <h1 className="font-heading text-2xl font-bold text-textneutral">{t('teach')}</h1>
      <p className="mt-1 text-sm text-gray-500">{t('teachSub')} {isAdmin ? t('teachAdminNote') : t('teachReviewNote')}</p>
      {searchParams.saved && <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{t('savedBanner')} {isAdmin ? '' : t('savedReviewNote')}</p>}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Link href="/teach/new" className={`${panel} group block transition hover:border-primary/50`}>
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary"><BookOpen /></span>
          <p className="mt-3 font-heading text-lg font-bold text-textneutral">{t('newSkillCourse')}</p>
          <p className="text-sm text-gray-500">{t('newSkillCourseSub')}</p>
        </Link>
        {canSchool ? (
          <Link href="/teach/school" className={`${panel} group block transition hover:border-primary/50`}>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary"><GraduationCap /></span>
            <p className="mt-3 font-heading text-lg font-bold text-textneutral">{t('addSchoolLessons')}</p>
            <p className="text-sm text-gray-500">{t('addSchoolLessonsSub')}</p>
          </Link>
        ) : (
          <div className={`${panel} opacity-70`}>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gray-100 text-gray-400"><GraduationCap /></span>
            <p className="mt-3 font-heading text-lg font-bold text-textneutral">{t('addSchoolLessons')}</p>
            <p className="text-sm text-gray-500">{t('needAssignmentNote')}</p>
          </div>
        )}
      </div>
      {isAdmin && <p className="mt-3 text-sm"><Link href="/admin/structure" className="text-primary underline">{t('manageStructure')}</Link></p>}

      <div className="mt-8 flex items-center justify-between"><h2 className="font-heading text-xl font-bold text-textneutral">{t('myCourses')} ({courses.length})</h2><Link href="/teach/new" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><Plus size={16} /> {t('newLabel')}</Link></div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {courses.length === 0 && <p className="text-sm text-gray-400">{t('noCoursesYet')}</p>}
        {courses.map((c) => (
          <div key={c.id} className={panel}>
            <div className="flex items-start justify-between gap-2"><p className="font-semibold text-textneutral">{c.title}</p><Chip s={c.status} /></div>
            <p className="mt-1 text-xs text-gray-500">{t('lessonsCountText').replace('{n}', String(counts[c.id] ?? 0))}{stats[c.id] ? ` · ${t('courseStatsText').replace('{started}', String(stats[c.id].started)).replace('{finished}', String(stats[c.id].finished))}` : ''}</p>
            {c.status === 'rejected' && c.rejection_reason && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{c.rejection_reason}</p>}
            <div className="mt-3 flex items-center gap-4 text-sm">
              <Link href={`/teach/course/${c.id}/edit`} className="font-semibold text-primary">{c.status === 'draft' ? t('continueLabel') : t('editAddLessons')}</Link>
              {c.status === 'approved' && <Link href={`/interests`} className="text-gray-500 underline">{t('viewLabel')}</Link>}
              <span className="ml-auto"><DeleteCourse id={c.id} /></span>
            </div>
          </div>
        ))}
      </div>

      {byTopic.size > 0 && (
        <>
          <h2 className="mt-8 font-heading text-xl font-bold text-textneutral">{t('mySchoolLessons')}</h2>
          <div className="mt-3 space-y-3">
            {[...byTopic.entries()].map(([topicId, ls]) => {
              const tp = ls[0].topics;
              return (
                <div key={topicId} className={panel}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-textneutral">{[tp?.subjects?.grades?.name, tp?.subjects?.name, tp?.name].filter(Boolean).join(' › ')}</p>
                    <Link href={`/teach/school?topic=${topicId}`} className="text-sm font-semibold text-primary">{t('editAndAdd')}</Link>
                  </div>
                  <ul className="mt-2 divide-y divide-gray-50 dark:divide-gray-800">
                    {ls.map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                        <span className="min-w-0 flex-1 truncate text-gray-600 dark:text-gray-300">{l.title}</span>
                        <Chip s={l.status} />
                        <DeleteLessonButton lessonId={l.id} />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
