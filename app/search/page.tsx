import { createClient } from '@/lib/supabase/server';
import { SearchContent, type SearchResult } from './SearchContent';

export const metadata = { title: 'Search — Simplexer' };

type LessonRow = { id: string; title: string; topic_id: string | null; course_id: string | null };
type CourseRow = { id: string; title: string; category_id: string; slug: string };

/**
 * Forgiving search (v13.5). The old version used Postgres full-text
 * websearch: you had to type a whole word, spelled the way the stemmer
 * expected — "I have to know lesson exactly to find something."
 *
 * Now the query is split into words and each word is matched as a
 * SUBSTRING (ilike '%word%') against lesson titles and content, course
 * titles and descriptions, and subject names. Words are OR-ed, so any
 * word from a title — or part of a word — finds the lesson, in English
 * and Amharic alike. Title matches rank first, then content matches,
 * then lessons found through their subject/course name.
 */
export default async function SearchPage(
  props: {
    searchParams: Promise<{ q?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const q = searchParams.q?.trim() ?? '';
  let results: SearchResult[] = [];

  if (q.length >= 2) {
    const supabase = await createClient();

    // Clean each word for PostgREST .or() syntax and ilike: strip the
    // characters that would break the filter string, then escape the
    // ilike wildcards so a typed % or _ is searched literally.
    const tokens = q
      .split(/\s+/)
      .map((w) => w.replace(/[%_,()"\\]/g, '').trim())
      .filter((w) => w.length >= 2)
      .slice(0, 6);
    const pats = (tokens.length ? tokens : [q.replace(/[%_,()"\\]/g, '').trim()]).filter(Boolean);

    if (pats.length) {
      const orOn = (cols: string[]) => pats.flatMap((p) => cols.map((c) => `${c}.ilike.%${p}%`)).join(',');

      const [byTitle, byContent, coursesRes] = await Promise.all([
        supabase.from('lessons').select('id, title, topic_id, course_id').or(orOn(['title'])).limit(20),
        supabase.from('lessons').select('id, title, topic_id, course_id').or(orOn(['content'])).limit(20),
        supabase
          .from('courses')
          .select('id, title, category_id, slug')
          .eq('status', 'approved')
          .or(orOn(['title', 'description']))
          .limit(10),
      ]);

      // Lessons whose SUBJECT or COURSE name matches, even when the
      // lesson's own title/content does not contain the word.
      const [subjectsRes, parentCoursesRes] = await Promise.all([
        supabase.from('subjects').select('id').or(orOn(['name'])).limit(20),
        supabase.from('courses').select('id').eq('status', 'approved').or(orOn(['title'])).limit(20),
      ]);
      const subjectIds = (subjectsRes.data ?? []).map((s: { id: string }) => s.id);
      const parentCourseIds = (parentCoursesRes.data ?? []).map((c: { id: string }) => c.id);
      const viaParent: LessonRow[] = [];
      if (subjectIds.length) {
        const { data: topics } = await supabase.from('topics').select('id').in('subject_id', subjectIds);
        const topicIds = (topics ?? []).map((tp: { id: string }) => tp.id);
        if (topicIds.length) {
          const { data } = await supabase.from('lessons').select('id, title, topic_id, course_id').in('topic_id', topicIds).limit(20);
          viaParent.push(...((data ?? []) as LessonRow[]));
        }
      }
      if (parentCourseIds.length) {
        const { data } = await supabase.from('lessons').select('id, title, topic_id, course_id').in('course_id', parentCourseIds).limit(20);
        viaParent.push(...((data ?? []) as LessonRow[]));
      }

      const dedupe = <T extends { id: string }>(rows: (T[] | null | undefined)[]) => {
        const seen = new Set<string>();
        const out: T[] = [];
        for (const set of rows) for (const row of set ?? []) if (!seen.has(row.id)) { seen.add(row.id); out.push(row); }
        return out;
      };
      const lessons = dedupe<LessonRow>([byTitle.data as LessonRow[] | null, byContent.data as LessonRow[] | null, viaParent]);
      const courses = (coursesRes.data ?? []) as CourseRow[];

      const lessonResults: SearchResult[] = lessons.map((l) => ({
        id: l.id,
        title: l.title,
        type: 'lesson',
        track: l.topic_id ? 'formal' : 'interest',
      }));

      // Fetch category slugs for course results so we can link straight to them.
      let courseResults: SearchResult[] = [];
      if (courses.length > 0) {
        const categoryIds = [...new Set(courses.map((c) => c.category_id))];
        const { data: categories } = await supabase.from('categories').select('id, slug').in('id', categoryIds);
        const categorySlugById: Record<string, string> = {};
        (categories ?? []).forEach((c: { id: string; slug: string }) => (categorySlugById[c.id] = c.slug));

        courseResults = courses.map((c) => ({
          id: c.id,
          title: c.title,
          type: 'course',
          categorySlug: categorySlugById[c.category_id],
          courseSlug: c.slug,
        }));
      }

      results = [...lessonResults, ...courseResults];
    }
  }

  return <SearchContent query={q} results={results} />;
}
