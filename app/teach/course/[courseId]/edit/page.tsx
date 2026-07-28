import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { getCategories } from '@/lib/queries/courses';
import { getLessonsForCourse } from '@/lib/queries/lessons';
import { createClient } from '@/lib/supabase/server';
import { EditCourseForm } from './EditCourseForm';

export const metadata = { title: 'Edit Course — Simplexer' };

export default async function EditCoursePage({ params }: { params: { courseId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = createClient();
  const { data: course } = await supabase.from('courses').select('*').eq('id', params.courseId).maybeSingle();
  // RLS already prevents fetching someone else's non-approved course, but
  // double check ownership explicitly for a clean redirect instead of a 500.
  if (!course) notFound();
  if (course.submitted_by !== user.authUser.id && user.profile?.role !== 'admin') {
    redirect('/teach');
  }

  const [categories, lessons] = await Promise.all([getCategories(), getLessonsForCourse(course.id)]);

  return <EditCourseForm course={course} categories={categories} lessons={lessons} />;
}
