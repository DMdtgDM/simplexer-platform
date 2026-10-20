import { PageHeader } from '@/components/PageHeader';
import { serverT } from '@/lib/i18n/server';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/queries/progress';
import { getTutorDirectory, getTutorDirectoryOpen } from '@/lib/queries/tutors';
import { card, field, btn } from '@/components/Ui';

export const metadata = { title: 'Tutors — Simplexer' };
export const dynamic = 'force-dynamic';

export default async function TutorsPage(
  props: { searchParams: Promise<{ q?: string; mode?: string; city?: string }> }
) {
  const searchParams = await props.searchParams;
  const [open, all, user] = await Promise.all([getTutorDirectoryOpen(), getTutorDirectory(), getCurrentUser()]);
  const isAdmin = user?.profile?.role === 'admin';
  if (!open && !isAdmin) {
    const { t } = await serverT();
    return (
      <div className="pt-6">
        <PageHeader eyebrow={t('tutors')} tone="green" title={t('findTutor')} subtitle={t('findTutorSub')} />
        <div className={`${card} mt-4 space-y-3`}>
          <p className="text-sm text-textneutral">{t('tutorDirectorySoon')}</p>
          <p className="text-sm text-gray-500">{t('needTutorNow')}</p>
          <Link href="/requests" className={btn}>{t('requestATutorBtn')}</Link>
        </div>
        <p className="mt-6 text-sm"><Link href="/tutor" className="text-primary underline">{t('areYouTutor')}</Link></p>
      </div>
    );
  }
  const q = (searchParams.q ?? '').toLowerCase().trim();
  const city = (searchParams.city ?? '').toLowerCase().trim();
  const tutors = all.filter((t) =>
    (!q || [...t.subjects, ...t.levels].some((x) => x.toLowerCase().includes(q))) &&
    (!city || t.city.toLowerCase().includes(city)) &&
    (!searchParams.mode || t.mode === searchParams.mode || t.mode === 'Both')
  );

  const { t } = await serverT();
  return (
    <div className="pt-6">
      <PageHeader eyebrow={t('tutors')} tone="green" title={t('findTutor')} subtitle={t('findTutorSub')} />
      {!open && <p className="mt-2 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-900">{t('adminOnlyNotice')}</p>}
      <form className={`${card} mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4`}>
        <input name="q" defaultValue={searchParams.q} placeholder={t('searchSubjectOrGrade')} className={`${field} sm:col-span-2`} />
        <select name="mode" defaultValue={searchParams.mode ?? ''} className={field}><option value="">{t('modeAnyLabel')}</option><option>Online</option><option>In person</option></select>
        <input name="city" defaultValue={searchParams.city} placeholder={t('city')} className={field} />
        <div className="sm:col-span-4"><button className={btn}>{t('search')}</button></div>
      </form>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tutors.length === 0 && <p className="text-sm text-gray-400 sm:col-span-2 lg:col-span-3">{t('noTutorsMatch')} {t('notFindingTutor')} <Link href="/requests" className="text-primary underline">{t('sendUsRequest')}</Link> {t('andWeWillFind')}</p>}
        {tutors.map((tu) => (
          <Link key={tu.user_id} href={`/tutors/${tu.user_id}`} className={`${card} block h-full hover:border-primary/40 hover:shadow-lift`}>
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark font-heading text-base font-bold text-white">
                {(tu.name?.trim()?.[0] ?? 'T').toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-textneutral">{tu.name}</p>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-950/60 dark:text-green-300">{t('verifiedBadge')}</span>
                  {tu.recommended && <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-200">{t('recommendedBadge')}</span>}
                </div>
                <p className="mt-1 text-sm text-textneutral">{tu.subjects.join(', ')}</p>
                <p className="text-xs text-gray-500">{tu.levels.join(', ')} · {tu.mode}{tu.city ? ` · ${tu.city}` : ''} · {t('tutorCardMeta').replace('{years}', String(tu.experience_years)).replace('{rate}', String(tu.rate))}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-sm"><Link href="/tutor" className="text-primary underline">{t('areYouTutor')}</Link></p>
    </div>
  );
}
