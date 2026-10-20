import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { getCategories } from '@/lib/queries/courses';
import { CourseBuilder } from '../builder/CourseBuilder';

export const metadata = { title: 'New course — Simplexer' };
export const dynamic = 'force-dynamic';

export default async function NewCoursePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const role = user.profile?.role;
  if (role !== 'teacher' && role !== 'admin') redirect('/profile');
  const categories = await getCategories();
  return <CourseBuilder mode="skill" uid={user.authUser.id} isAdmin={role === 'admin'} categories={categories.map((c) => ({ id: c.id, name: c.name }))} tree={[]} initialLessons={[]} />;
}
