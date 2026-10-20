import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { getCategories } from '@/lib/queries/courses';
import { getCourseForEdit } from '@/lib/queries/teach';
import { CourseBuilder } from '../../../builder/CourseBuilder';

export const metadata = { title: 'Edit course — Simplexer' };
export const dynamic = 'force-dynamic';

export default async function EditCoursePage(props: { params: Promise<{ courseId: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const data = await getCourseForEdit(params.courseId);
  if (!data) notFound();
  const { course, lessons } = data;
  const isAdmin = user.profile?.role === 'admin';
  if (course.submitted_by !== user.authUser.id && !isAdmin) redirect('/teach');
  const categories = await getCategories();

  return (
    <CourseBuilder
      mode="skill" uid={user.authUser.id} isAdmin={isAdmin} tree={[]} initialLessons={lessons}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      course={{
        id: course.id, status: course.status, rejection_reason: course.rejection_reason, categoryId: course.category_id, title: course.title,
        description: course.description ?? '', difficulty: course.difficulty, language: course.language ?? 'Amharic',
        instructor: course.instructor ?? '', coverImageUrl: course.cover_image_url ?? '',
      }}
    />
  );
}
