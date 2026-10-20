import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { getRequestsForAdmin } from '@/lib/queries/tutors';
import {
  updateRequest, convertRequestToJob,
} from '@/lib/actions/people';
import { card, field, btn, btnGhost } from '@/components/Ui';
import { createClient } from '@/lib/supabase/server';
import { serverT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function AdminRequests(
  props: { searchParams: Promise<{ ok?: string; error?: string; q?: string }> }
) {
  const searchParams = await props.searchParams;
  const { t } = await serverT();
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.profile?.role !== 'admin') redirect('/');
  // Seeing the requests clears the admin's request notifications.
  (await createClient()).from('notifications').update({ is_read: true })
    .eq('user_id', user.authUser.id).eq('kind', 'request').eq('is_read', false);
  const allRequests = await getRequestsForAdmin();
  const q = (searchParams.q ?? '').trim().toLowerCase();
  const requests = q
    ? allRequests.filter((r) => [r.subject, r.requester_name, r.contact_phone, r.city, r.grade].some((v) => (v ?? '').toLowerCase().includes(q)))
    : allRequests;

  return (
    <div className="pt-6">
      <Link href="/admin/review" className="text-xs text-gray-500">{t('adminReview')}</Link>
      <h1 className="mt-2 font-heading text-2xl font-bold text-textneutral">Requests ({requests.filter((r) => r.status !== 'closed').length} open)</h1>
      {searchParams.ok && <p className="mt-3 text-sm text-green-700">{searchParams.ok}</p>}
      {searchParams.error && <p className="mt-3 text-sm text-red-600">{searchParams.error}</p>}
      <form className="mt-4" method="get">
        <input name="q" defaultValue={searchParams.q ?? ''} placeholder={t('searchRequestsPlaceholder')} className={field} />
      </form>
      <div className="mt-4 space-y-3">
        {requests.length === 0 && <p className="text-sm text-gray-400">{t('noRequestsYet')}</p>}
        {requests.map((r) => (
          <div key={r.id} className={`${card} ${r.status === 'closed' ? 'opacity-60' : ''}`}>
            <p className="text-xs text-gray-400">{r.kind} · {r.status} · {new Date(r.created_at).toLocaleDateString('en-GB')} · from {r.requester_name}</p>
            <p className="mt-1 text-sm font-semibold text-textneutral">{[r.subject, r.grade, r.mode].filter(Boolean).join(' · ')}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">{r.description}</p>
            {(r as { contact_phone?: string }).contact_phone && (
              <p className="mt-1 text-sm">{t('phoneLabel')}: <a className="font-semibold text-primary underline" href={`tel:${(r as { contact_phone?: string }).contact_phone}`}>{(r as { contact_phone?: string }).contact_phone}</a>
                {(r as { gender_pref?: string }).gender_pref && (r as { gender_pref?: string }).gender_pref !== 'any' ? ` · wants a ${(r as { gender_pref?: string }).gender_pref} tutor` : ''}</p>
            )}
            <p className="text-xs text-gray-500">{[r.area, r.city].filter(Boolean).join(', ')} {r.schedule && `· ${r.schedule}`} {r.budget > 0 && `· ${r.budget} ETB`}</p>
            {r.tutor_id && <Link href={`/tutors/${r.tutor_id}`} className="text-xs text-primary underline">{t('askedForTutor')}</Link>}
            <form action={updateRequest.bind(null, r.id)} className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <select name="status" defaultValue={r.status} className={field}><option value="new">{t('statusReceived')}</option><option value="reviewing">{t('statusReviewing')}</option><option value="matched">{t('matchedOption')}</option><option value="closed">{t('closed')}</option></select>
              <input name="note" defaultValue={r.admin_note} placeholder={t('replyPlaceholder')} className={`${field} sm:col-span-2`} />
              <button className={btnGhost}>{t('save')}</button>
            </form>
            {r.kind === 'tutor' && !r.job_id && (
              <form action={convertRequestToJob.bind(null, r.id)} className="mt-2"><button className={btn}>{t('publishAsJob')}</button></form>
            )}
            {r.job_id && <Link href={`/jobs/${r.job_id}`} className="mt-2 inline-block text-xs text-primary underline">{t('viewJob')}</Link>}
          </div>
        ))}
      </div>
    </div>
  );
}
