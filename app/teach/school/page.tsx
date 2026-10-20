import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { createClient } from '@/lib/supabase/server';
import { getStructureTree, getTopicLessonsForEdit } from '@/lib/queries/teach';
import { CourseBuilder } from '../builder/CourseBuilder';

export const metadata = { title: 'School lessons — Simplexer' };
export const dynamic = 'force-dynamic';

export default async function SchoolLessonsPage(props: { searchParams: Promise<{ topic?: string }> }) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const role = user.profile?.role;
  if (role !== 'teacher' && role !== 'admin') redirect('/profile');
  const isAdmin = role === 'admin';
  const uid = user.authUser.id;

  let tree = await getStructureTree();
  if (!isAdmin) {
    const { data } = await (await createClient()).from('teacher_assignments').select('subject_id').eq('teacher_id', uid);
    const allowed = new Set((data ?? []).map((a: { subject_id: string }) => a.subject_id));
    tree = tree.map((g) => ({ ...g, subjects: g.subjects.filter((s) => allowed.has(s.id)) })).filter((g) => g.subjects.length > 0);
  }
  const initial = searchParams.topic ? await getTopicLessonsForEdit(searchParams.topic, uid) : [];
  return <CourseBuilder mode="school" uid={uid} isAdmin={isAdmin} categories={[]} tree={tree} initialLessons={initial} initialTopicId={searchParams.topic} />;
}
