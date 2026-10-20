import Link from 'next/link';
import { getCurrentUser } from '@/lib/queries/progress';
import { getPublicProfile } from '@/lib/queries/tutors';
import { card } from '@/components/Ui';

export const dynamic = 'force-dynamic';

export default async function PublicProfilePage(props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user) return <p className="pt-8 text-sm"><Link href="/login" className="text-primary underline">Log in</Link> to view profiles.</p>;
  const p = await getPublicProfile(params.userId);
  if (!p) return <p className="pt-8 text-sm text-gray-500">This profile is private or does not exist.</p>;
  return (
    <div className="pt-6">
      <div className={card}>
        <h1 className="font-heading text-2xl font-bold text-textneutral">{p.name}</h1>
        <p className="text-sm text-gray-500">{p.account_type === 'parent' ? 'Parent' : 'Student'}{p.grade_name ? ` · ${p.grade_name}` : ''}</p>
        {p.bio && <p className="mt-3 whitespace-pre-line text-sm text-textneutral">{p.bio}</p>}
      </div>
    </div>
  );
}
