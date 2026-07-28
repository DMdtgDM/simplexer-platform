import { notFound } from 'next/navigation';
import { getCategoryBySlug, getCourseBySlug } from '@/lib/queries/courses';
import { getLessonsForCourse } from '@/lib/queries/lessons';
import { getCurrentUser, getProgressForLessons } from '@/lib/queries/progress';
import { CourseOverviewContent } from './CourseOverviewContent';

export const revalidate = 300;

export default async function CoursePage({
  params,
}: {
  params: { category: string; course: string };
}) {
  const category = await getCategoryBySlug(params.category);
  if (!category) notFound();
  const course = await getCourseBySlug(category.id, params.course);
  if (!course) notFound();

  const lessons = await getLessonsForCourse(course.id);
  const user = await getCurrentUser();
  const progressMap = user
    ? await getProgressForLessons(
        user.authUser.id,
        lessons.map((l) => l.id)
      )
    : {};

  return (
    <CourseOverviewContent
      category={category}
      course={course}
      lessons={lessons}
      progressMap={progressMap}
      loggedIn={Boolean(user)}
    />
  );
}
