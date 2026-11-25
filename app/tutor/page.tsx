import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { getMyTutor } from '@/lib/queries/tutors';
import { getJob } from '@/lib/queries/jobs';
import { createClient } from '@/lib/supabase/server';
import { TutorForm } from './TutorForm';
import { card, btnGhost } from '@/components/Ui';
import { serverT } from '@/lib/i18n/server';
import { Eye } from 'lucide-react';
import type { DictKey } from '@/lib/i18n/dictionary';

export const metadata = { title: 'Become a tutor — Simplexer' };
export const dynamic = 'force-dynamic';

const BANNER: Record<string, [string, DictKey]> = {
  draft: ['bg-gray-50 text-gray-700', 'bannerDraft'],
  pending: ['bg-yellow-50 text-yellow-900', 'bannerPending'],
  verified: ['bg-green-50 text-green-800', 'bannerVerified'],
  rejected: ['bg-red-50 text-red-800', 'bannerRejected'],
  suspended: ['bg-red-50 text-red-800', 'bannerSuspended'],
};

export default async function TutorPage(props: { searchParams: Promise<{ error?: string; ok?: string; job?: string }> }) {
  const searchParams = await props.searchParams;
  const { t } = await serverT();
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const p = await getMyTutor(user.authUser.id);
  const b = BANNER[p?.status ?? 'draft'] ?? BANNER.draft;
  const wantedJob = searchParams.job && p?.status !== 'verified' ? await getJob(searchParams.job) : null;
  // Arriving from a job with a profile already saved or under review: record
  // the job now, so the moment they are verified they are sent back to it
  // (migration 0030). New applicants record it through the form instead.
  if (wantedJob && p && (p as { interested_job_id?: string | null }).interested_job_id !== wantedJob.id) {
    await (await createClient()).from('tutor_profiles').update({ interested_job_id: wantedJob.id }).eq('user_id', user.authUser.id);
  }

  return (
    <div className="pt-6">
      <h1 className="font-heading text-2xl font-bold text-textneutral">{p ? t('yourTutorProfile') : t('becomeTutor')}</h1>
      <p className="mt-1 text-sm text-gray-500">{t('tutorPageSub')}</p>
      {searchParams.error && <p className="mt-3 text-sm text-red-600">{searchParams.error}</p>}
      {searchParams.ok && <p className="mt-3 text-sm text-green-700">{searchParams.ok}</p>}
      {wantedJob && (
        <div className={`${card} mt-3 border-primary/40`}>
          <p className="text-sm text-textneutral">{t('applyJobBanner')}</p>
          <p className="mt-1 text-sm font-semibold text-textneutral">{wantedJob.subject}{wantedJob.grade ? ` · ${wantedJob.grade}` : ''}</p>
          {p?.status === 'pending' && (
            <Link href={`/jobs/${wantedJob.id}`} className="mt-2 inline-block text-sm font-semibold text-primary underline">{t('applyBackToJob')}</Link>
          )}
        </div>
      )}
      <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${b[0]}`}>{t(b[1])}</p>
      {p?.admin_note && <p className={`${card} mt-3 text-sm`}><b>{t('noteFromTeam')}</b> {p.admin_note}</p>}
      {p?.status === 'verified' && (
        <Link href={`/tutors/${p.user_id}`} className={`${btnGhost} mt-3`}>
          <Eye size={16} /> {t('seeFamilyView')}
        </Link>
      )}
      {p?.status !== 'suspended' && <TutorForm uid={user.authUser.id} profile={p} jobId={wantedJob?.id} />}
    </div>
  );
}
