import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { createClient } from '@/lib/supabase/server';
import { resolveReport } from '@/lib/actions/reports';
import type { Report } from '@/lib/types';
import { card, btn } from '@/components/Ui';

export const metadata = { title: 'Reports — Simplexer' };
export const dynamic = 'force-dynamic';

const linkFor = (r: Report) =>
  r.kind === 'lesson' ? `/lesson/${r.target}` : r.kind === 'competition' ? `/competitions/${r.target}` : r.kind === 'job' ? `/jobs/${r.target}` : null;

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.profile?.role !== 'admin') redirect('/');
  const { data } = await (await createClient()).from('reports').select('*').order('resolved').order('created_at', { ascending: false }).limit(100);
  const reports = (data ?? []) as Report[];

  return (
    <div className="pt-6">
      <Link href="/admin" className="text-xs text-gray-500">Admin</Link>
      <h1 className="mt-2 font-heading text-2xl font-bold text-textneutral">Reports ({reports.filter((r) => !r.resolved).length} open)</h1>
      <div className="mt-4 space-y-3">
        {reports.length === 0 && <p className="text-sm text-gray-400">No reports yet.</p>}
        {reports.map((r) => (
          <div key={r.id} className={`${card} flex items-start justify-between gap-3 ${r.resolved ? 'opacity-50' : ''}`}>
            <div className="text-sm">
              <p className="text-xs text-gray-400">{r.kind} · {new Date(r.created_at).toLocaleDateString('en-GB')}</p>
              <p className="mt-1 text-textneutral">{r.note}</p>
              {linkFor(r) && <Link href={linkFor(r)!} className="text-xs text-primary underline">Open the page</Link>}
            </div>
            {!r.resolved && <form action={resolveReport.bind(null, r.id)}><button className={btn}>Resolve</button></form>}
          </div>
        ))}
      </div>
    </div>
  );
}
