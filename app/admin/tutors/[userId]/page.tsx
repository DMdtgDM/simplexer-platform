import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { getTutorForAdmin } from '@/lib/queries/tutors';
import { reviewTutor } from '@/lib/actions/people';
import { card, field, btn } from '@/components/Ui';
import { serverT } from '@/lib/i18n/server';

export const metadata = { title: 'Applicant — Simplexer' };
export const dynamic = 'force-dynamic';

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

export default async function AdminTutorDetail(props: { params: Promise<{ userId: string }> }) {
  const { userId } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.profile?.role !== 'admin') redirect('/');
  const { t: tr } = await serverT();
  const t = await getTutorForAdmin(userId);
  if (!t) notFound();

  const displayName = t.legal_name || t.name || t.email || 'No name yet';
  const initials = displayName.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const statusTone = t.status === 'verified' ? 'bg-green-100 text-green-700' : t.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : t.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600';
  const applied = fmtDate(t.submitted_at);
  const verified = fmtDate(t.verified_at);

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 py-1.5">
      <span className="w-32 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <span className="min-w-0 flex-1 text-sm text-textneutral">{children}</span>
    </div>
  );

  return (
    <div className="pt-6">
      <Link href="/admin/tutors" className="text-xs text-gray-500">← {tr('tutorApplications')}</Link>

      <div className={`${card} mt-3`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-light font-heading text-lg font-extrabold text-white">{initials}</span>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-xl font-bold text-textneutral">{displayName}</p>
            <p className="text-sm text-gray-500">
              {t.email ? <a href={`mailto:${t.email}`} className="text-primary hover:underline">{t.email}</a> : 'no email'}
              {t.phone ? <> · <a href={`tel:${t.phone}`} className="text-primary hover:underline">{t.phone}</a></> : <> · <span className="text-gray-400">No phone provided</span></>}
              {[t.area, t.city].filter(Boolean).length ? ` · ${[t.area, t.city].filter(Boolean).join(', ')}` : ''}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {applied ? `Applied ${applied}` : 'Not submitted yet'}
              {verified && ` · Verified ${verified}`}
              {t.gender && ` · ${t.gender}`}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone}`}>{t.status}</span>
          {t.recommended && <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-800">★ recommended</span>}
        </div>

        {t.job && (
          <p className="mt-4 rounded-xl bg-primary-50 px-3 py-2 text-sm text-textneutral">
            Came to apply after viewing this job:{' '}
            <Link href={`/jobs/${t.job.id}`} className="font-semibold text-primary hover:underline">{t.job.subject}</Link>
            <span className="text-gray-500"> ({t.job.status})</span>
          </p>
        )}

        <div className="mt-4 divide-y divide-gray-50 border-t border-gray-100 pt-2 dark:divide-gray-800 dark:border-gray-800">
          <Row label="Phone">
            {t.phone ? <a href={`tel:${t.phone}`} className="font-semibold text-primary hover:underline">{t.phone}</a> : <span className="text-gray-400">No phone provided{t.status === 'draft' ? ' — saved as a draft, not submitted yet' : ''}</span>}
          </Row>
          <Row label="Subjects">
            {t.subjects.length ? t.subjects.map((sub) => <span key={sub} className="mb-1 mr-1.5 inline-block rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary">{sub}</span>) : '—'}
          </Row>
          <Row label="Levels">{t.levels.length ? t.levels.join(', ') : '—'}</Row>
          <Row label="Languages">{t.languages.length ? t.languages.join(', ') : '—'}</Row>
          <Row label="Mode">{t.mode}</Row>
          <Row label="Experience">{t.experience_years} yrs</Row>
          <Row label="Rate">{t.rate ? `${t.rate} ETB per session` : <span className="text-gray-400">Not set (optional)</span>}</Row>
          <Row label="Availability">{t.availability || '—'}</Row>
          <Row label="In directory">{t.visible ? 'Yes' : 'No'}</Row>
        </div>

        <div className="mt-2 divide-y divide-gray-50 border-t border-gray-100 pt-2 dark:divide-gray-800 dark:border-gray-800">
          <Row label="Education">{t.education || '—'}</Row>
          <Row label="Institution">{t.institution || '—'}</Row>
          <Row label="Field of study">{t.field_of_study || '—'}</Row>
          <Row label="National exam">{t.national_exam || '—'}</Row>
        </div>

        {t.bio && (
          <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">About their teaching</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-gray-300">{t.bio}</p>
          </div>
        )}

        <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Documents</p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {([['id', 'National ID'], ['education', 'Education proof'], ['exam', 'Exam result'], ['other', 'Other']] as const).map(([k, label]) =>
              t.links[k]
                ? <a key={k} href={t.links[k]!} target="_blank" rel="noopener noreferrer" className="rounded-full border border-primary/30 px-3 py-1.5 font-semibold text-primary hover:bg-primary-50">{label} ↗</a>
                : <span key={k} className="rounded-full border border-dashed border-gray-200 px-3 py-1.5 text-gray-300 dark:border-gray-700">{label}: none</span>)}
          </div>
          <p className="mt-2 text-xs text-gray-400">Compare the name on the ID with the legal name above before you verify.</p>
        </div>
      </div>

      <form action={reviewTutor.bind(null, t.user_id)} className={`${card} mt-4`}>
        <p className="font-heading text-base font-bold text-textneutral">Your decision</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select name="status" defaultValue={t.status === 'draft' ? 'pending' : t.status} className={field}>
            <option value="verified">{tr('verifyOption')}</option><option value="rejected">{tr('reject')}</option><option value="suspended">{tr('suspendOption')}</option><option value="pending">{tr('keepPending')}</option>
          </select>
          <select name="score" defaultValue={t.assessment_score ?? ''} className={field}>
            <option value="">{tr('assessmentScore')}</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} {tr('ofFive')}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="recommended" defaultChecked={t.recommended} /> Recommended</label>
          <button className={btn}>{tr('saveReview')}</button>
        </div>
        <textarea name="note" rows={2} defaultValue={t.admin_note} placeholder={tr('tutorNotePlaceholder')} className={`${field} mt-2 w-full`} />
      </form>
    </div>
  );
}
