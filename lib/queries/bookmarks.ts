import { createClient } from '@/lib/supabase/server';

/** Bookmarked lesson ids for a user, as a Set for cheap `.has()` lookups. */
export async function getBookmarkedLessonIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from('bookmarks').select('lesson_id').eq('user_id', userId);
  return new Set((data ?? []).map((row: { lesson_id: string }) => row.lesson_id));
}

/** Bookmarked lessons joined with lesson details, newest first, for /profile/bookmarks. */
export async function getBookmarkedLessonDetails(
  userId: string
): Promise<{ lessonId: string; title: string; estMinutes: number; savedAt: string }[]> {
  const supabase = await createClient();
  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('lesson_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const lessonIds = (bookmarks ?? []).map((b: { lesson_id: string }) => b.lesson_id);
  if (lessonIds.length === 0) return [];

  const { data: lessons } = await supabase.from('lessons').select('id, title, est_minutes').in('id', lessonIds);
  const lessonMap: Record<string, { title: string; est_minutes: number }> = {};
  (lessons ?? []).forEach((l: { id: string; title: string; est_minutes: number }) => {
    lessonMap[l.id] = { title: l.title, est_minutes: l.est_minutes };
  });

  return (bookmarks ?? [])
    .filter((b: { lesson_id: string }) => lessonMap[b.lesson_id])
    .map((b: { lesson_id: string; created_at: string }) => ({
      lessonId: b.lesson_id,
      title: lessonMap[b.lesson_id].title,
      estMinutes: lessonMap[b.lesson_id].est_minutes,
      savedAt: b.created_at,
    }));
}
