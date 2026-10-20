import { createPublicClient } from '@/lib/supabase/public';

export async function getHomeStats() {
  const db = createPublicClient();
  const head = { count: 'exact' as const, head: true };
  const [l, c, g, s] = await Promise.all([
    db.from('lessons').select('id', head).eq('status', 'approved'),
    db.from('courses').select('id', head).eq('status', 'approved'),
    db.from('grades').select('id', head),
    db.from('subjects').select('id', head),
  ]);
  return { lessons: l.count ?? 0, courses: c.count ?? 0, grades: g.count ?? 0, subjects: s.count ?? 0 };
}
