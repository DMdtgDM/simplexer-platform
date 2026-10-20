import Link from 'next/link';
import { getCurrentUser } from '@/lib/queries/progress';
import { getCompetitions, getCompetitionCourseOptions, getCourseProgressFraction, competitionState, formatEat, accessLabel, prizeList } from '@/lib/queries/competitions';
import { createCompetition } from '@/lib/actions/competitions';
import { PageHeader } from '@/components/PageHeader';
import { serverT } from '@/lib/i18n/server';
import { card, field, btn } from '@/components/Ui';

export const metadata = { title: 'Competitions — Simplexer' };
export const dynamic = 'force-dynamic';

const badge = { live: 'bg-green-100 text-green-700', upcoming: 'bg-yellow-100 text-yellow-700', ended: 'bg-gray-100 text-gray-500' };

const STATES = ['live', 'upcoming', 'ended', 'draft'] as const;
type StateFilter = (typeof STATES)[number];

export default async function CompetitionsPage(
  props: { searchParams: Promise<{ error?: string; ok?: string; q?: string; status?: string }> }
) {
  const searchParams = await props.searchParams;
  const { t } = await serverT();
  const [user, allComps, courseOptions] = await Promise.all([getCurrentUser(), getCompetitions(), getCompetitionCourseOptions()]);
  const role = user?.profile?.role;
  const canCreate = role === 'teacher' || role === 'admin';
  const isAdmin = role === 'admin';
  // Course competitions are for the course's students: they only appear here
  // once you have finished more than half of the course (managers always see them).
  const uid = user?.authUser.id;
  const fractions = new Map<string, number>();
  if (uid) {
    const courseIds = [...new Set(allComps.map((c) => c.course_id).filter(Boolean))] as string[];
    await Promise.all(courseIds.map(async (cid) => fractions.set(cid, await getCourseProgressFraction(uid, cid))));
  }
  const q = (searchParams.q ?? '').trim().toLowerCase();
  const comps = allComps.filter((c) => {
    if (q && !c.title.toLowerCase().includes(q)) return false;
    if (!c.course_id) return true;
    if (isAdmin || c.created_by === uid) return true;
    return (fractions.get(c.course_id) ?? 0) > 0.5;
  });
  const stateFilter = (STATES as readonly string[]).includes(searchParams.status ?? '') ? (searchParams.status as StateFilter) : '';
  const counts = {
    total: comps.length,
    live: comps.filter((c) => c.status !== 'draft' && competitionState(c) === 'live').length,
    upcoming: comps.filter((c) => c.status !== 'draft' && competitionState(c) === 'upcoming').length,
    ended: comps.filter((c) => c.status !== 'draft' && competitionState(c) === 'ended').length,
    draft: comps.filter((c) => c.status === 'draft').length,
  };
  const shown = stateFilter
    ? comps.filter((c) => (stateFilter === 'draft' ? c.status === 'draft' : c.status !== 'draft' && competitionState(c) === stateFilter))
    : comps;
  const stateLabel = (s: string) => (s === 'live' ? t('stateLive') : s === 'upcoming' ? t('stateUpcoming') : t('stateEnded'));
  const pill = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${active ? 'bg-secondary text-white shadow-card' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-secondary/40 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700'}`;
  const hrefFor = (status: string) => {
    const p = new URLSearchParams();
    if (searchParams.q) p.set('q', searchParams.q);
    if (status) p.set('status', status);
    const s = p.toString();
    return s ? `/competitions?${s}` : '/competitions';
  };

  return (
    <div className="pt-6">
      <PageHeader eyebrow={t('compete')} tone="secondary" title={t('competitions')} subtitle={t('competitionsSub')} />
      {searchParams.error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{searchParams.error}</p>}
      {searchParams.ok && <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{searchParams.ok}</p>}

      {!user && (
        <div className={`${card} mt-4 flex flex-wrap items-center gap-3 border-secondary/30 bg-secondary/5`}>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-base font-bold text-textneutral">{t('loginToCompete')}</p>
            <p className="mt-0.5 text-sm text-gray-500">{t('loginToCompeteNote')}</p>
          </div>
          <Link href="/login?next=/competitions" className={btn}>{t('login')}</Link>
        </div>
      )}

      <form className="mt-4" method="get">
        <input name="q" defaultValue={searchParams.q ?? ''} placeholder={t('searchCompetitionsPlaceholder')} className={field} />
        {stateFilter && <input type="hidden" name="status" value={stateFilter} />}
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary-dark">{t('statTotal')}: {counts.total}</span>
        <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">{t('stateLive')}: {counts.live}</span>
        <span className="rounded-full bg-yellow-100 px-3 py-1.5 text-xs font-semibold text-yellow-700">{t('stateUpcoming')}: {counts.upcoming}</span>
        <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500">{t('stateEnded')}: {counts.ended}</span>
        {counts.draft > 0 && <span className="rounded-full bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600">{t('draftBadge')}: {counts.draft}</span>}
        <span className="mx-1 hidden h-5 w-px bg-gray-200 sm:block" />
        <Link href={hrefFor('')} className={pill(!stateFilter)}>{t('filterAll')}</Link>
        <Link href={hrefFor('live')} className={pill(stateFilter === 'live')}>{t('stateLive')}</Link>
        <Link href={hrefFor('upcoming')} className={pill(stateFilter === 'upcoming')}>{t('stateUpcoming')}</Link>
        <Link href={hrefFor('ended')} className={pill(stateFilter === 'ended')}>{t('stateEnded')}</Link>
        {counts.draft > 0 && <Link href={hrefFor('draft')} className={pill(stateFilter === 'draft')}>{t('draftBadge')}</Link>}
      </div>

      {canCreate && (
        <details className={`${card} mt-4`}>
          <summary className="cursor-pointer text-sm font-semibold text-primary">{t('createCompetition')}</summary>
          <form action={createCompetition} className="mt-3 grid gap-2 sm:grid-cols-2">
            <input name="title" required placeholder={t('titlePlaceholder')} className={`${field} sm:col-span-2`} />
            <textarea name="description" rows={2} placeholder={t('rulesPlaceholder')} className={`${field} sm:col-span-2`} />
            {!isAdmin && <p className="text-xs text-gray-500 sm:col-span-2">{t('teacherFeeNote')}</p>}
            <label className="text-xs text-gray-500">{t('compBelongsToCourse')}
              <select name="course_id" className={field}>
                <option value="">{t('generalOption')}</option>
                {courseOptions.map((c) => <option key={c.id} value={c.id}>{c.title} — {t('compCourseOptionNote')}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-500">{t('compWhoCanEnter')}
              <select name="access" className={field}>
                <option value="open">{t('accessAnyone')}</option>
                <option value="code">{t('accessCodeOption')}</option>
                <option value="approval">{t('compPeopleIApprove')}{isAdmin ? ` ${t('compEntryFeeNote')}` : ''}</option>
              </select>
            </label>
            <label className="text-xs text-gray-500">{t('accessCodeLabel')}<input name="code" className={field} /></label>
{isAdmin && (
<>
            <label className="text-xs text-gray-500">{t('entryFeeLabel')}<input name="entry_fee" type="number" min={0} defaultValue={0} className={field} /></label>
</>
)}
            <label className="text-xs text-gray-500">{t('timeLimitLabel')}<input name="time_limit_min" type="number" min={1} max={180} defaultValue={10} className={field} /></label>
{isAdmin && (
<>
            <textarea name="payment_info" rows={2} placeholder={t('howToPayPlaceholder')} className={`${field} sm:col-span-2`} />
            <input name="prize_1" placeholder={t('prize1Placeholder')} className={field} />
            <input name="prize_2" placeholder={t('prize2Placeholder')} className={field} />
            <input name="prize_3" placeholder={t('prize3Placeholder')} className={`${field} sm:col-span-2`} />
</>
)}
            <label className="text-xs text-gray-500">{t('opensLabel')}<input name="starts_at" type="datetime-local" required className={field} /></label>
            <label className="text-xs text-gray-500">{t('closesLabel')}<input name="ends_at" type="datetime-local" required className={field} /></label>
            <p className="text-xs text-gray-500 sm:col-span-2">{t('nextAddQuestions')}</p>
            <button className={`${btn} sm:col-span-2 sm:justify-self-start`}>{t('createAndAdd')}</button>
          </form>
        </details>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.length === 0 && <p className="text-sm text-gray-400 sm:col-span-2 xl:col-span-3">{t('noCompetitionsYet')}</p>}
        {shown.map((c) => {
          const s = competitionState(c);
          const prizes = prizeList(c);
          return (
            <Link key={c.id} href={`/competitions/${c.id}`} className={`${card} block h-full hover:border-primary/40`}>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {c.status === 'draft' ? <span className="rounded-full bg-gray-200 px-2 py-0.5 font-semibold text-gray-600">{t('draftBadge')}</span>
                  : <span className={`rounded-full px-2 py-0.5 font-semibold ${badge[s]}`}>{stateLabel(s)}</span>}
                <span className="rounded-full bg-primary-50 px-2 py-0.5 text-primary">{accessLabel(c, t)}</span>
                {c.course_id && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">{t('courseBadge')}: {c.course_title ?? t('pastHalfOnly')}</span>}
                <span className="text-gray-400">{c.players} {c.players === 1 ? t('playerLabel') : t('playersLabel')} · {c.time_limit_min} {t('minShort')}</span>
              </div>
              <p className="mt-1 font-semibold text-textneutral">{c.title}</p>
              {prizes.length > 0 && <p className="text-xs text-yellow-700">{prizes.map((p) => `#${p.rank} ${p.prize}`).join(' · ')}</p>}
              <p className="text-xs text-gray-400">{formatEat(c.starts_at)} to {formatEat(c.ends_at)} (EAT)</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
