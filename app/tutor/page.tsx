import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { getMyTutor } from '@/lib/queries/tutors';
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

export default async function TutorPage(props: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const searchParams = await props.searchParams;
  const { t } = await serverT();
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const p = await getMyTutor(user.authUser.id);
  const b = BANNER[p?.status ?? 'draft'] ?? BANNER.draft;

  return (
    <div className="pt-6">
      <h1 className="font-heading text-2xl font-bold text-textneutral">{p ? t('yourTutorProfile') : t('becomeTutor')}</h1>
      <p className="mt-1 text-sm text-gray-500">{t('tutorPageSub')}</p>
      {searchParams.error && <p className="mt-3 text-sm text-red-600">{searchParams.error}</p>}
      {searchParams.ok && <p className="mt-3 text-sm text-green-700">{searchParams.ok}</p>}
      <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${b[0]}`}>{t(b[1])}</p>
      {p?.admin_note && <p className={`${card} mt-3 text-sm`}><b>{t('noteFromTeam')}</b> {p.admin_note}</p>}
      {p?.status === 'verified' && (
        <Link href={`/tutors/${p.user_id}`} className={`${btnGhost} mt-3`}>
          <Eye size={16} /> {t('seeFamilyView')}
        </Link>
      )}
      {p?.status !== 'suspended' && <TutorForm uid={user.authUser.id} profile={p} />}
    </div>
  );
}
