import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { getReviewCounts, getTutorDirectoryOpen } from '@/lib/queries/tutors';
import { setTutorDirectoryPublic } from '@/lib/actions/people';
import { btn, btnGhost } from '@/components/Ui';
import { card } from '@/components/Ui';

export const dynamic = 'force-dynamic';

export default async function ReviewHub(props: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.profile?.role !== 'admin') redirect('/');
  const [c, open] = await Promise.all([getReviewCounts(), getTutorDirectoryOpen()]);
  const items = [
    { href: '/admin/tutors', label: 'Tutor applications', n: c.tutors, hint: 'Check documents, assess, verify' },
    { href: '/admin/requests', label: 'Requests from families', n: c.requests, hint: 'Match tutors, create jobs' },
    { href: '/admin/reports', label: 'Reports', n: c.reports, hint: 'Mistakes and problems users flagged' },
    { href: '/admin/structure', label: 'Grades, subjects and topics', n: 0, hint: 'Add or remove grades, subjects, topics, categories' },
    { href: '/admin', label: 'Content and users', n: 0, hint: 'Course queue, teachers, links' },
  ];
  return (
    <div className="pt-6">
      <h1 className="font-heading text-2xl font-bold text-textneutral">Admin review</h1>
      {searchParams.ok && <p className="mt-3 text-sm text-green-700">{searchParams.ok}</p>}
      {searchParams.error && <p className="mt-3 text-sm text-red-600">{searchParams.error}</p>}
      <div className={`${card} mt-4 flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <p className="font-semibold text-textneutral">Tutor directory: {open ? 'public' : 'admin-only'}</p>
          <p className="text-xs text-gray-500">{open ? 'Everyone can browse verified tutors.' : 'Only admins can see tutors. Families send requests and you match them.'}</p>
        </div>
        <form action={setTutorDirectoryPublic.bind(null, !open)}><button className={open ? btnGhost : btn}>{open ? 'Make admin-only' : 'Open to everyone'}</button></form>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className={`${card} block hover:border-primary/40`}>
            <p className="font-semibold text-textneutral">{i.label} {i.n > 0 && <span className="ml-1 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{i.n}</span>}</p>
            <p className="text-xs text-gray-500">{i.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
