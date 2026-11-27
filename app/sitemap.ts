import type { MetadataRoute } from 'next';
import { createPublicClient } from '@/lib/supabase/public';

const BASE_URL = 'https://simplexer-platform.vercel.app';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/` },
    { url: `${BASE_URL}/formal` },
    { url: `${BASE_URL}/interests` },
    { url: `${BASE_URL}/tutors` },
    { url: `${BASE_URL}/jobs` },
    { url: `${BASE_URL}/competitions` },
    { url: `${BASE_URL}/about` },
    { url: `${BASE_URL}/community` },
  ];

  try {
    const supabase = createPublicClient();
    const [lessons, courses, tutors, jobs] = await Promise.all([
      supabase.from('lessons').select('id, created_at'),
      supabase.from('courses').select('slug, categories(slug)').eq('status', 'approved'),
      supabase.rpc('tutor_directory'),
      supabase.from('jobs').select('id, created_at').eq('status', 'open'),
    ]);

    for (const lesson of lessons.data ?? []) {
      routes.push({ url: `${BASE_URL}/lesson/${lesson.id}`, lastModified: lesson.created_at });
    }
    const courseRows = (courses.data ?? []) as unknown as {
      slug: string;
      categories: { slug: string } | { slug: string }[] | null;
    }[];
    for (const course of courseRows) {
      const category = Array.isArray(course.categories) ? course.categories[0] : course.categories;
      if (category?.slug) {
        routes.push({ url: `${BASE_URL}/interests/${category.slug}/${course.slug}` });
      }
    }
    for (const tutor of (tutors.data ?? []) as { user_id: string }[]) {
      routes.push({ url: `${BASE_URL}/tutors/${tutor.user_id}` });
    }
    for (const job of jobs.data ?? []) {
      routes.push({ url: `${BASE_URL}/jobs/${job.id}`, lastModified: job.created_at });
    }

    // Formal track structure pages (grade → subject → topic) — prime search
    // targets ("Grade 8 maths Ethiopia" and the like).
    const [grades, subjects, topics] = await Promise.all([
      supabase.from('grades').select('slug'),
      supabase.from('subjects').select('slug, grades(slug)'),
      supabase.from('topics').select('slug, subjects(slug, grades(slug))'),
    ]);
    for (const g of grades.data ?? []) {
      routes.push({ url: `${BASE_URL}/formal/${g.slug}` });
    }
    type SlugJoin = { slug: string } | { slug: string }[] | null;
    const one = (v: SlugJoin): string | null => (Array.isArray(v) ? v[0]?.slug : v?.slug) ?? null;
    for (const sub of (subjects.data ?? []) as unknown as { slug: string; grades: SlugJoin }[]) {
      const gs = one(sub.grades);
      if (gs) routes.push({ url: `${BASE_URL}/formal/${gs}/${sub.slug}` });
    }
    for (const top of (topics.data ?? []) as unknown as {
      slug: string;
      subjects: { slug: string; grades: SlugJoin } | { slug: string; grades: SlugJoin }[] | null;
    }[]) {
      const sub = Array.isArray(top.subjects) ? top.subjects[0] : top.subjects;
      const gs = sub ? one(sub.grades) : null;
      if (sub && gs) routes.push({ url: `${BASE_URL}/formal/${gs}/${sub.slug}/${top.slug}` });
    }
  } catch {
    // If Supabase is unreachable the sitemap still lists the static pages.
  }

  return routes;
}
