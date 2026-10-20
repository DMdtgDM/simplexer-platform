import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { getJob, getApplications } from '@/lib/queries/jobs';
import { isVerifiedTutor } from '@/lib/queries/tutors';
import {
  applyToJob, acceptApplicant, closeJob, reopenJob, deleteJob,
} from '@/lib/actions/jobs';
import { createClient } from '@/lib/supabase/server';
import { ReportButton } from '@/components/ReportButton';
import { field } from '@/components/Ui';
import { serverT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function JobPage(
  props: {
    params: Promise<{ jobId: string }>;
    searchParams: Promise<{ error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { t } = await serverT();
  const [user, job] = await Promise.all([getCurrentUser(), getJob(params.jobId)]);
  if (!job) notFound();

  const apps = await getApplications(job.id);
  // Phone numbers no longer live on the public jobs row (0022). The
  // job_connect_card RPC returns them only to the admin, the poster, the
  // matched tutor, or the family behind the linked request.
  const me0 = user?.authUser.id;
  let connectCard: { poster_name: string; parent_phone: string | null; tutor_name: string | null; tutor_phone: string | null } | null = null;
  if (me0 && job.tutor_id) {
    const { data: cardRows } = await (await createClient()).rpc('job_connect_card', { p_job: job.id });
    connectCard = (cardRows as typeof connectCard[] | null)?.[0] ?? null;
  }
  const tutorPhone = connectCard?.tutor_phone ?? null;
  const me = user?.authUser.id;
  const role = user?.profile?.role;
  const isPoster = role === 'admin';
  const isMatchedTutor = !!me && job.tutor_id === me;
  const verified = me ? await isVerifiedTutor(me) : false;
  const canApply = !!me && (role === 'teacher' || verified) && job.status === 'open';
  const applied = !!me && apps.some((a) => a.applicant_id === me);

  return (
    <div className="pt-6">
      <Link href="/jobs" className="text-xs text-gray-500">
        {t('allJobs')}
      </Link>
      <div className="mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-light p-5 text-white shadow-lift sm:p-6">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-2xl font-extrabold leading-tight">{job.subject}</h1>
            <p className="mt-1 text-sm text-white/85">{job.grade ? `${job.grade} · ` : ''}{job.mode}{job.mode === 'In person' && (job.city || job.area) ? ` · ${[job.area, job.city].filter(Boolean).join(', ')}` : ''} · {t('forLabel')} {job.poster_name}</p>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-2 text-center backdrop-blur">
            <p className="font-heading text-xl font-extrabold">{job.budget} ETB</p>
            <p className="text-[11px] text-white/80">{t('perSession')} · {job.sessions_per_week}x/week</p>
          </div>
        </div>
        <span className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${job.status === 'open' ? 'bg-green-400/90 text-green-950' : job.status === 'filled' ? 'bg-blue-300 text-blue-950' : 'bg-white/40 text-white'}`}>
          {job.status === 'open' ? t('openApplyNow') : job.status === 'filled' ? t('tutorFound') : t('closed')}
        </span>
      </div>
      <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-card dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <p className="text-sm leading-relaxed text-textneutral">{job.description}</p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-4 text-xs dark:border-gray-800 sm:grid-cols-3">
          {[
            [t('modeLabel'), job.mode],
            [t('whereLabel'), job.mode === 'In person' ? [job.area, job.city].filter(Boolean).join(', ') || t('notGiven') : t('online')],
            [t('whenLabel'), job.schedule || t('toAgree')],
            [t('sessionsLabel'), t('perWeekText').replace('{n}', String(job.sessions_per_week))],
            [t('languageLabel'), job.language],
            [t('budgetLabel'), `${job.budget} ETB ${t('perSession')}`],
            [t('forLabel'), job.poster_name],
            [t('tutorLabel'), job.gender_pref === 'male' ? t('maleOnly') : job.gender_pref === 'female' ? t('femaleOnly') : t('maleOrFemale')],
            ...(isPoster ? [[t('parentPhone'), connectCard?.parent_phone || t('notGiven')]] as [string, string][] : []),
            [t('statusLabel'), job.status],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-gray-400">{k}</dt>
              <dd className="font-medium text-textneutral">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {searchParams.error && <p className="mt-3 text-sm text-red-600">{searchParams.error}</p>}

      {isPoster && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-textneutral">{t('applicants')} ({apps.length})</h2>
            <div className="flex items-center gap-3">
              {job.status === 'open' && (
                <form action={closeJob.bind(null, job.id)}>
                  <button className="text-xs text-red-600 underline">{t('closeJob')}</button>
                </form>
              )}
              {job.status === 'closed' && (
                <form action={reopenJob.bind(null, job.id)}>
                  <button className="text-xs font-semibold text-primary underline">{t('reopenJob')}</button>
                </form>
              )}
              <form action={deleteJob.bind(null, job.id)}>
                <button className="text-xs text-red-600 underline">{t('deleteJob')}</button>
              </form>
            </div>
          </div>
          {apps.length === 0 && <p className="mt-2 text-sm text-gray-400">{t('noApplicationsYet')}</p>}
          <div className="mt-2 space-y-3">
            {apps.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-card dark:border-gray-800 dark:bg-gray-900">
                <div>
                  <p className="text-sm font-semibold text-textneutral">
                    {a.applicant_name} <span className="font-normal text-gray-400">· {a.rate} ETB</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{a.message}</p>
                </div>
                {job.status === 'open' ? (
                  <form action={acceptApplicant.bind(null, job.id, a.applicant_id)}>
                    <button className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary-dark">
                      {t('acceptBtn')}
                    </button>
                  </form>
                ) : (
                  a.applicant_id === job.tutor_id && <span className="text-xs font-semibold text-green-600">{t('acceptedLabel')}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isPoster && job.tutor_id && (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/40">
          <h2 className="font-heading text-base font-bold text-textneutral">{t('connectThem')}</h2>
          <p className="mt-1 text-sm text-textneutral">
            {t('parentLabel')}: <strong>{job.poster_name}</strong>{connectCard?.parent_phone ? <> · <a className="font-semibold text-primary underline" href={`tel:${connectCard.parent_phone}`}>{connectCard.parent_phone}</a></> : ` · ${t('noPhoneGiven')}`}
          </p>
          <p className="mt-1 text-sm text-textneutral">
            {t('tutorLabel')}: <strong>{connectCard?.tutor_name ?? apps.find((a) => a.applicant_id === job.tutor_id)?.applicant_name ?? t('acceptedTutorFallback')}</strong>
            {tutorPhone ? <> · <a className="font-semibold text-primary underline" href={`tel:${tutorPhone}`}>{tutorPhone}</a></> : ` · ${t('noPhoneOnProfile')}`}
          </p>
          <p className="mt-1 text-xs text-gray-500">{t('callBothSidesNote')}</p>
        </div>
      )}

      {isMatchedTutor && (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/40">
          <h2 className="font-heading text-base font-bold text-textneutral">{t('familyContact')}</h2>
          <p className="mt-1 text-sm text-textneutral">
            {t('parentLabel')}: <strong>{job.poster_name}</strong>{connectCard?.parent_phone ? <> · <a className="font-semibold text-primary underline" href={`tel:${connectCard.parent_phone}`}>{connectCard.parent_phone}</a></> : ` · ${t('noPhoneGiven')}`}
          </p>
          <p className="mt-1 text-xs text-gray-500">{t('callFamilyNote')}</p>
        </div>
      )}

      {!isPoster && job.status !== 'open' && <p className="mt-6 text-sm text-gray-500">{t('jobFilledNote')}</p>}
      {!me && job.status === 'open' && (
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-primary">
          {t('loginToApply')}
        </Link>
      )}
      {me && !isPoster && job.status === 'open' && !canApply && (
        <p className="mt-6 text-sm text-gray-500">{t('onlyVerifiedApply')} <Link href="/tutor" className="text-primary underline">{t('becomeVerifiedLink')}</Link>.</p>
      )}
      {canApply && applied && <p className="mt-6 text-sm text-green-600">{t('youApplied')}</p>}
      {canApply && !applied && (
        <form action={applyToJob.bind(null, job.id)} className="mt-6 space-y-2 rounded-xl border border-gray-200 bg-white p-4 shadow-card dark:border-gray-800 dark:bg-gray-900">
          <h2 className="font-heading text-lg font-bold text-textneutral">{t('apply')}</h2>
          <textarea name="message" required rows={3} placeholder={t('whyFitPlaceholder')} className={field} />
          <input name="rate" type="number" min={0} placeholder={t('ratePerSession')} className={field} />
          <button className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark">
            {t('sendApplication')}
          </button>
        </form>
      )}
      <ReportButton kind="job" target={job.id} />
    </div>
  );
}
