import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { getMyRequests, getTutorPublic } from '@/lib/queries/tutors';
import { createClient } from '@/lib/supabase/server';
import { RequestForm } from './RequestForm';
import { PageHeader } from '@/components/PageHeader';
import { serverT } from '@/lib/i18n/server';
import { card } from '@/components/Ui';

export const metadata = { title: 'My requests — Simplexer' };
export const dynamic = 'force-dynamic';

const STATUS_COLOR = {
  new: 'bg-yellow-100 text-yellow-800', reviewing: 'bg-blue-100 text-blue-800',
  matched: 'bg-green-100 text-green-800', closed: 'bg-gray-100 text-gray-600',
} as const;

export default async function RequestsPage(
  props: { searchParams: Promise<{ error?: string; ok?: string; tutor?: string }> }
) {
  const searchParams = await props.searchParams;
  const { t } = await serverT();
  const statusLabel = { new: t('statusReceived'), reviewing: t('statusReviewing'), matched: t('statusMatched'), closed: t('closed') } as const;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const [requests, tutor] = await Promise.all([
    getMyRequests(user.authUser.id),
    searchParams.tutor ? getTutorPublic(searchParams.tutor) : null,
  ]);
  // Once a tutor is matched, the family gets the tutor's number here (and
  // the tutor gets the family's on the job page). The RPC only answers
  // people connected to the job.
  const tutorCards = new Map<string, { tutor_name: string | null; tutor_phone: string | null }>();
  const supabase = await createClient();
  await Promise.all(
    requests
      .filter((r) => r.status === 'matched' && r.job_id)
      .map(async (r) => {
        const { data } = await supabase.rpc('job_connect_card', { p_job: r.job_id as string });
        const row = (data as { tutor_name: string | null; tutor_phone: string | null }[] | null)?.[0];
        if (row?.tutor_phone) tutorCards.set(r.id, row);
      }),
  );

  return (
    <div className="pt-6">
      <PageHeader eyebrow={t('requests')} tone="primary" title={t('myRequests')} subtitle={t('myRequestsSub')} />
      {searchParams.error && <p className="mt-3 text-sm text-red-600">{searchParams.error}</p>}
      {searchParams.ok && <p className="mt-3 text-sm text-green-700">{searchParams.ok}</p>}

      <div id="new" className="mt-4"><h2 className="font-heading text-lg font-bold text-textneutral">{requests.length ? t('newRequestTitle') : t('firstRequestTitle')}</h2><RequestForm tutor={tutor} /></div>

      <h2 className="mt-8 font-heading text-lg font-bold text-textneutral">{t('historyLabel')} ({requests.length})</h2>
      <div className="mt-2 space-y-3">
        {requests.length === 0 && <p className="text-sm text-gray-400">{t('noRequestsYet')}</p>}
        {requests.map((r) => (
          <div key={r.id} className={card}>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_COLOR[r.status]}`}>{statusLabel[r.status]}</span>
              <span className="text-gray-400">{r.kind === 'tutor' ? t('tutorRequestKind') : t('otherRequestKind')} · {new Date(r.created_at).toLocaleDateString('en-GB')}</span>
            </div>
            <p className="mt-1 text-sm text-textneutral">{[r.subject, r.grade].filter(Boolean).join(' · ')}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">{r.description}</p>
            {r.admin_note && <p className="mt-2 rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary"><b>{t('teamLabel')}:</b> {r.admin_note}</p>}
            {tutorCards.get(r.id) && (
              <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-textneutral dark:bg-green-950/40">
                {t('yourTutorLabel')}: <b>{tutorCards.get(r.id)?.tutor_name ?? t('tutorLabel')}</b> ·{' '}
                <a className="font-semibold text-primary underline" href={`tel:${tutorCards.get(r.id)?.tutor_phone}`}>{tutorCards.get(r.id)?.tutor_phone}</a>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
