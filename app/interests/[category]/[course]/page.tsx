import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategoryBySlug, getCourseBySlug } from '@/lib/queries/courses';
import { getLessonsForCourse } from '@/lib/queries/lessons';
import { getCurrentUser, getProgressForLessons } from '@/lib/queries/progress';
import { JsonLd } from '@/components/JsonLd';
import { CourseOverviewContent } from './CourseOverviewContent';

export const revalidate = 300;

export async function generateMetadata(
  props: {
    params: Promise<{ category: string; course: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  try {
    const category = await getCategoryBySlug(params.category);
    const course = category ? await getCourseBySlug(category.id, params.course) : null;
    if (category && course) {
      const title = `${course.title} — Simplexer`;
      const description =
        course.description ??
        `Learn ${course.title} on Simplexer — a ${category.name} course with step-by-step lessons in Amharic and English.`;
      const images = course.cover_image_url ? [course.cover_image_url] : undefined;
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          type: 'website',
          siteName: 'Simplexer',
          url: `/interests/${params.category}/${params.course}`,
          ...(images ? { images } : {}),
        },
        twitter: { card: 'summary_large_image', title, description, ...(images ? { images } : {}) },
      };
    }
  } catch {
    // Fall back to the site defaults from the root layout.
  }
  return {};
}

export default async function CoursePage(
  props: {
    params: Promise<{ category: string; course: string }>;
  }
) {
  const params = await props.params;
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

  const courseJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Course',
        name: course.title,
        description:
          course.description ??
          `Learn ${course.title} on Simplexer — a ${category.name} course with step-by-step lessons in Amharic and English.`,
        provider: {
          '@type': 'Organization',
          name: 'Simplexer',
          sameAs: 'https://simplexer-platform.vercel.app',
        },
        hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Interest Track', item: 'https://simplexer-platform.vercel.app/interests' },
          {
            '@type': 'ListItem',
            position: 2,
            name: category.name,
            item: `https://simplexer-platform.vercel.app/interests/${category.slug}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: course.title,
            item: `https://simplexer-platform.vercel.app/interests/${category.slug}/${course.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <JsonLd data={courseJsonLd} />
      <CourseOverviewContent
        category={category}
        course={course}
        lessons={lessons}
        progressMap={progressMap}
        loggedIn={Boolean(user)}
      />
    </>
  );
}
