import { createClient } from '@/lib/supabase/server';
import { SearchContent, type SearchResult } from './SearchContent';

export const metadata = { title: 'Search — Simplexer' };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim() ?? '';
  let results: SearchResult[] = [];

  if (q.length >= 2) {
    const supabase = createClient();

    const [{ data: lessons }, { data: courses }] = await Promise.all([
      supabase
        .from('lessons')
        .select('id, title, topic_id, course_id')
        .textSearch('search_vector', q, { type: 'websearch', config: 'english' })
        .limit(20),
      supabase
        .from('courses')
        .select('id, title, category_id, slug')
        .eq('status', 'approved')
        .textSearch('search_vector', q, { type: 'websearch', config: 'english' })
        .limit(10),
    ]);

    const lessonResults: SearchResult[] = (lessons ?? []).map(
      (l: { id: string; title: string; topic_id: string | null; course_id: string | null }) => ({
        id: l.id,
        title: l.title,
        type: 'lesson',
        track: l.topic_id ? 'formal' : 'interest',
      })
    );

    // Fetch category slugs for course results so we can link straight to them.
    let courseResults: SearchResult[] = [];
    if (courses && courses.length > 0) {
      const categoryIds = [...new Set(courses.map((c: { category_id: string }) => c.category_id))];
      const { data: categories } = await supabase.from('categories').select('id, slug').in('id', categoryIds);
      const categorySlugById: Record<string, string> = {};
      (categories ?? []).forEach((c: { id: string; slug: string }) => (categorySlugById[c.id] = c.slug));

      courseResults = courses.map((c: { id: string; title: string; category_id: string; slug: string }) => ({
        id: c.id,
        title: c.title,
        type: 'course',
        categorySlug: categorySlugById[c.category_id],
        courseSlug: c.slug,
      }));
    }

    results = [...lessonResults, ...courseResults];
  }

  return <SearchContent query={q} results={results} />;
}
