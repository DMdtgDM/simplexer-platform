import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { getTutorsForAdmin } from '@/lib/queries/tutors';
import { reviewTutor } from '@/lib/actions/people';
import { card, field, btn } from '@/components/Ui';
import { serverT } from '@/lib/i18n/server';

export const metadata = { title: 'Tutor applications — Simplexer' };
export const dynamic = 'force-dynamic';

export default async function AdminTutors(
  props: { searchParams: Promise<{ ok?: string; error?: string; q?: string }> }
) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.profile?.role !== 'admin') redirect('/');
  const { t: tr } = await serverT();
  const allTutors = await getTutorsForAdmin();
  const q = (searchParams.q ?? '').trim().toLowerCase();
  const tutors = q
    ? allTutors.filter((t) => [t.legal_name, t.name, t.email, t.phone, t.city, ...(t.subjects ?? [])].some((v) => (v ?? '').toLowerCase().includes(q)))
    : allTutors;

  return (
    <div className="pt-6">
      <Link href="/admin/review" className="text-xs text-gray-500">{tr('adminReview')}</Link>
      <h1 className="mt-2 font-heading text-2xl font-bold text-textneutral">{tr('tutorApplications')} ({tutors.length})</h1>
      <p className="mt-1 text-xs text-gray-500">Open every document, compare the name on the ID with the legal name, check education, then assess and decide. Only verified tutors appear to families.</p>
      {searchParams.ok && <p className="mt-3 text-sm text-green-700">{searchParams.ok}</p>}
      {searchParams.error && <p className="mt-3 text-sm text-red-600">{searchParams.error}</p>}
      <form className="mt-4" method="get">
        <input name="q" defaultValue={searchParams.q ?? ''} placeholder={tr('searchTutorsPlaceholder')} className={field} />
      </form>
      <div className="mt-4 space-y-4">
        {tutors.length === 0 && <p className="text-sm text-gray-400">{tr('noTutorsYet')}</p>}
        {tutors.map((t) => {
          const displayName = t.legal_name || t.name || 'No name yet';
          const initials = displayName.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
          const statusTone = t.status === 'verified' ? 'bg-green-100 text-green-700' : t.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : t.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600';
          return (
          <div key={t.user_id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-center gap-3 p-4 pb-0 sm:p-5 sm:pb-0">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-light font-heading text-base font-extrabold text-white">{initials}</span>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-base font-bold text-textneutral">{displayName}</p>
                <p className="truncate text-xs text-gray-500">{t.email || 'no email'} · {t.phone || 'no phone'} · {[t.area, t.city].filter(Boolean).join(', ') || 'no location'}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone}`}>{t.status}</span>
              {t.recommended && <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-800">★ recommended</span>}
              <span className="rounded-2xl bg-primary-50 px-3 py-1.5 text-center">
                <span className="block font-heading text-sm font-extrabold text-primary">{t.rate} ETB</span>
                <span className="block text-[10px] text-gray-500">per session</span>
              </span>
            </div>
            <div className="p-4 pt-3 sm:p-5 sm:pt-3">
            <div className="flex flex-wrap gap-1.5">
              {t.subjects.length ? t.subjects.map((sub) => <span key={sub} className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary">{sub}</span>) : <span className="text-xs text-gray-400">{tr('noSubjectsYet')}</span>}
              {t.levels.map((lv) => <span key={lv} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-gray-800">{lv}</span>)}
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{[t.education, t.institution, t.field_of_study].filter(Boolean).join(' · ')}{t.national_exam && ` · Exam: ${t.national_exam}`} · {t.mode} · {t.experience_years} yrs experience</p>
            {t.bio && <p className="mt-1 line-clamp-2 text-sm text-gray-500">{t.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {([['id', 'National ID'], ['education', 'Education proof'], ['exam', 'Exam result'], ['other', 'Other']] as const).map(([k, label]) =>
                t.links[k] ? <a key={k} href={t.links[k]!} target="_blank" rel="noopener noreferrer" className="rounded-full border border-primary/30 px-2.5 py-1 font-semibold text-primary hover:bg-primary-50">{label} ↗</a>
                  : <span key={k} className="rounded-full border border-dashed border-gray-200 px-2.5 py-1 text-gray-300 dark:border-gray-700">{label}: none</span>)}
            </div>
            <form action={reviewTutor.bind(null, t.user_id)} className="mt-4 grid gap-2 border-t border-gray-100 pt-4 dark:border-gray-800 sm:grid-cols-2 lg:grid-cols-4">
              <select name="status" defaultValue={t.status === 'draft' ? 'pending' : t.status} className={field}>
                <option value="verified">{tr('verifyOption')}</option><option value="rejected">{tr('reject')}</option><option value="suspended">{tr('suspendOption')}</option><option value="pending">{tr('keepPending')}</option>
              </select>
              <select name="score" defaultValue={t.assessment_score ?? ''} className={field}>
                <option value="">{tr('assessmentScore')}</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} {tr('ofFive')}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="recommended" defaultChecked={t.recommended} /> Recommended</label>
              <button className={btn}>{tr('saveReview')}</button>
              <textarea name="note" rows={2} defaultValue={t.admin_note} placeholder={tr('tutorNotePlaceholder')} className={`${field} sm:col-span-4`} />
            </form>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
