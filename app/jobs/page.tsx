import { PageHeader } from '@/components/PageHeader';
import { card, field, btn } from '@/components/Ui';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/queries/progress';
import { getJobs } from '@/lib/queries/jobs';
import { postJob } from '@/lib/actions/jobs';
import { serverT } from '@/lib/i18n/server';
import { GRADE_LEVELS } from '@/lib/grade-levels';

export const metadata = { title: 'Tutor jobs — Simplexer' };
export const dynamic = 'force-dynamic';


export default async function JobsPage(
  props: {
    searchParams: Promise<{ error?: string; q?: string; mode?: string; city?: string; status?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const { t } = await serverT();
  const statusFilter = searchParams.status === 'open' || searchParams.status === 'closed' ? searchParams.status : '';
  const [user, allJobs] = await Promise.all([getCurrentUser(), getJobs({ q: searchParams.q, mode: searchParams.mode, city: searchParams.city })]);
  const jobs = statusFilter ? await getJobs({ ...searchParams, status: statusFilter }) : allJobs;
  const isAdmin = user?.profile?.role === 'admin';
  const filtered = !!(searchParams.q || searchParams.mode || searchParams.city);
  const openCount = allJobs.filter((j) => j.status === 'open').length;
  const closedCount = allJobs.length - openCount;
  const pill = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${active ? 'bg-primary text-white shadow-card' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-primary/40 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700'}`;
  const hrefFor = (status: string) => {
    const p = new URLSearchParams();
    if (searchParams.q) p.set('q', searchParams.q);
    if (searchParams.mode) p.set('mode', searchParams.mode);
    if (searchParams.city) p.set('city', searchParams.city);
    if (status) p.set('status', status);
    const s = p.toString();
    return s ? `/jobs?${s}` : '/jobs';
  };

  return (
    <div className="pt-6">
      <PageHeader eyebrow={t('jobs')} tone="primary" title={t('tutorJobs')} subtitle={t('tutorJobsSub')} />
      {searchParams.error && <p className="mt-3 text-sm text-red-600">{searchParams.error}</p>}

      <form className={`${card} mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4`}>
        <input name="q" defaultValue={searchParams.q} placeholder={t('searchJobs')} className={`${field} sm:col-span-2`} />
        <select name="mode" defaultValue={searchParams.mode ?? ''} className={field}>
          <option value="">{t('onlineOrInPerson')}</option>
          <option value="Online">{t('online')}</option>
          <option value="In person">{t('inPerson')}</option>
        </select>
        <input name="city" defaultValue={searchParams.city} placeholder={t('city')} className={field} />
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <div className="flex gap-3 sm:col-span-4">
          <button className={btn}>{t('search')}</button>
          {filtered && <Link href="/jobs" className="self-center text-sm text-gray-500 underline">{t('clearLabel')}</Link>}
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary">{t('statTotal')}: {allJobs.length}</span>
        <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">{t('statOpen')}: {openCount}</span>
        <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500">{t('statClosed')}: {closedCount}</span>
        <span className="mx-1 hidden h-5 w-px bg-gray-200 sm:block" />
        <Link href={hrefFor('')} className={pill(!statusFilter)}>{t('filterAll')}</Link>
        <Link href={hrefFor('open')} className={pill(statusFilter === 'open')}>{t('filterOpenOnly')}</Link>
        <Link href={hrefFor('closed')} className={pill(statusFilter === 'closed')}>{t('filterClosedOnly')}</Link>
      </div>

      {isAdmin && (
        <details className={`${card} mt-4`}>
          <summary className="cursor-pointer text-sm font-semibold text-primary">{t('postJob')}</summary>
          <form action={postJob} className="mt-3 grid gap-2 sm:grid-cols-2">
            <input name="for" placeholder={t('requestedByPlaceholder')} className={`${field} sm:col-span-2`} />
            <input name="subject" required placeholder={t('subjectPlaceholder')} className={field} />
            <select name="grade" className={field}><option value="">{t('gradeLevel')}</option>{GRADE_LEVELS.map((g) => <option key={g}>{g}</option>)}</select>
            <select name="mode" className={field}>
              <option value="Online">{t('online')}</option>
              <option value="In person">{t('inPerson')}</option>
            </select>
            <select name="language" className={field}>
              <option>Amharic</option>
              <option>English</option>
              <option>Both</option>
            </select>
            <input name="city" placeholder={t('cityInPersonPlaceholder')} className={field} />
            <input name="area" placeholder={t('areaPlaceholder')} className={field} />
            <input name="schedule" placeholder={t('schedulePlaceholder')} className={field} />
            <input name="sessions_per_week" type="number" min={1} max={14} defaultValue={2} placeholder={t('sessionsPerWeekPlaceholder')} className={field} />
            <input name="budget" type="number" min={0} placeholder={t('budgetPerSession')} className={field} />
            <input name="contact_phone" placeholder={t('parentPhonePlaceholder')} className={field} />
            <select name="gender_pref" className={field}>
              <option value="any">{t('tutorMaleOrFemale')}</option>
              <option value="male">{t('tutorMaleOnly')}</option>
              <option value="female">{t('tutorFemaleOnly')}</option>
            </select>
            <textarea name="description" required rows={3} placeholder={t('helpPlaceholder')} className={`${field} sm:col-span-2`} />
            <button className={`${btn} sm:col-span-2 sm:justify-self-start`}>{t('postJob')}</button>
          </form>
        </details>
      )}
      {!user && (
        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-primary">{t('loginToApply')}</Link>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {jobs.length === 0 && <p className="text-sm text-gray-400 sm:col-span-2 xl:col-span-3">{filtered || statusFilter ? t('noJobsMatch') : t('noJobsYet')}</p>}
        {jobs.map((j) => (
          <Link key={j.id} href={`/jobs/${j.id}`} className="group block h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift dark:border-gray-800 dark:bg-gray-900">
            <div className="flex h-full gap-0">
              <span className={`w-1.5 shrink-0 ${j.status === 'open' ? 'bg-green-500' : j.status === 'filled' ? 'bg-blue-500' : 'bg-gray-300'}`} />
              <div className="min-w-0 flex-1 p-4 sm:p-5">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-lg font-bold leading-snug text-textneutral">{j.subject}</p>
                    <p className="mt-0.5 text-xs font-medium text-gray-500">
                      {j.grade ? `${j.grade} · ` : ''}{j.mode}{j.mode === 'In person' && (j.city || j.area) ? ` · ${[j.area, j.city].filter(Boolean).join(', ')}` : ''} · {t('postedLabel')} {new Date(j.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading text-lg font-extrabold text-primary">{j.budget} <span className="text-xs font-semibold">ETB</span></p>
                    <p className="text-[11px] text-gray-400">{t('perSession')}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${j.status === 'open' ? 'bg-green-100 text-green-700' : j.status === 'filled' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                      {j.status === 'open' ? t('openApplyNow') : j.status === 'filled' ? t('tutorFound') : t('closed')}
                    </span>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{j.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                  {[j.schedule ? `${j.schedule}` : null, `${j.sessions_per_week}x ${t('perWeekChip')}`, j.language, j.gender_pref === 'male' ? t('maleTutor') : j.gender_pref === 'female' ? t('femaleTutor') : null].filter(Boolean).map((chip) => (
                    <span key={chip as string} className="rounded-full bg-primary-50 px-2 py-0.5 font-medium text-primary">{chip}</span>
                  ))}
                  <span className="ml-auto text-xs font-semibold text-primary opacity-0 transition group-hover:opacity-100">{t('viewAndApply')} →</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
