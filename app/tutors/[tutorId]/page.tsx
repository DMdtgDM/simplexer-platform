import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTutorPublic } from '@/lib/queries/tutors';
import { getCurrentUser } from '@/lib/queries/progress';
import { card, btn } from '@/components/Ui';
import { ReportButton } from '@/components/ReportButton';
import { serverT } from '@/lib/i18n/server';
import { BadgeCheck, Star, Eye } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TutorDetail(props: { params: Promise<{ tutorId: string }> }) {
  const params = await props.params;
  const { t } = await serverT();
  const [tutor, user] = await Promise.all([getTutorPublic(params.tutorId), getCurrentUser()]);
  if (!tutor) notFound();
  const isOwner = user?.authUser.id === tutor.user_id;

  const chips = (items: string[]) => (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {items.map((x) => (
        <span key={x} className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary">{x}</span>
      ))}
    </div>
  );
  const rows: [string, string][] = [
    [t('teachesLabel'), `${tutor.mode}${tutor.city ? ` · ${tutor.city}` : ''}`],
    [t('experienceYears'), t('yearsCount').replace('{n}', String(tutor.experience_years))],
    [t('educationLabel'), [tutor.education, tutor.field_of_study].filter(Boolean).join(', ') || t('notGiven')],
    [t('availableLabel'), tutor.availability || t('toAgree')],
    [t('ratePerSession'), `${tutor.rate} ETB`],
  ];

  return (
    <div className="pt-6 pb-10">
      <Link href="/tutors" className="text-xs text-gray-500 hover:text-primary">← {t('allTutors')}</Link>

      {isOwner && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-secondary/30 bg-secondary/10 px-4 py-3">
          <p className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-textneutral">
            <Eye size={16} className="shrink-0 text-secondary-dark" /> {t('previewBanner')}
          </p>
          <Link href="/tutor" className="text-sm font-semibold text-primary underline">{t('backToMyTutorPage')}</Link>
        </div>
      )}

      <div className="mt-3 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 text-white shadow-card sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 font-heading text-2xl font-bold ring-2 ring-white/40">
            {(tutor.name?.trim()?.[0] ?? 'T').toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-2xl font-bold leading-tight">{tutor.name}</h1>
            <p className="mt-0.5 text-sm text-white/85">{tutor.subjects.join(' · ')}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold">
                <BadgeCheck size={12} /> {t('verifiedBySimplexer')}
              </span>
              {tutor.recommended && (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-300/90 px-2.5 py-0.5 text-[11px] font-semibold text-yellow-900">
                  <Star size={12} /> {t('recommendedBadge')}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="font-heading text-xl font-extrabold">{tutor.rate} <span className="text-xs font-semibold">ETB</span></p>
            <p className="text-[11px] text-white/80">{t('perSession')}</p>
          </div>
        </div>
      </div>

      {tutor.bio && (
        <div className={`${card} mt-4`}>
          <p className="whitespace-pre-line text-sm leading-relaxed text-textneutral">{tutor.bio}</p>
        </div>
      )}

      <div className={`${card} mt-4 space-y-4`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('subjectsLabel')}</p>
          {chips(tutor.subjects)}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('levels')}</p>
          {chips(tutor.levels)}
        </div>
        {tutor.languages.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('languagesYouTeach')}</p>
            {chips(tutor.languages)}
          </div>
        )}
        <dl className="grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 text-sm sm:grid-cols-2 dark:border-gray-800">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-gray-400">{k}</dt>
              <dd className="mt-0.5 font-medium text-textneutral">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={`${card} mt-4 flex flex-wrap items-center gap-3`}>
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-gray-500">{t('tutorSafetyNote')}</p>
        <Link href={`/requests?tutor=${tutor.user_id}#new`} className={btn}>{t('requestThisTutor')}</Link>
      </div>
      <ReportButton kind="tutor" target={tutor.user_id} />
    </div>
  );
}
