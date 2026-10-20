import { notFound } from 'next/navigation';
import { getCategoryBySlug, getCoursesForCategory } from '@/lib/queries/courses';
import { getLessonsForCourse } from '@/lib/queries/lessons';
import { CourseListContent } from './CourseListContent';

export const revalidate = 3600;

export default async function CategoryPage(props: { params: Promise<{ category: string }> }) {
  const params = await props.params;
  const category = await getCategoryBySlug(params.category);
  if (!category) notFound();

  const courses = await getCoursesForCategory(category.id);

  const lessonCounts: Record<string, number> = {};
  const estMinutes: Record<string, number> = {};
  await Promise.all(
    courses.map(async (c) => {
      const lessons = await getLessonsForCourse(c.id);
      lessonCounts[c.id] = lessons.length;
      estMinutes[c.id] = lessons.reduce((sum, l) => sum + l.est_minutes, 0);
    })
  );

  return (
    <CourseListContent
      category={category}
      courses={courses}
      lessonCounts={lessonCounts}
      estMinutes={estMinutes}
    />
  );
}
