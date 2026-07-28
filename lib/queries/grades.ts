import { createClient } from '@/lib/supabase/server';
import type { Grade, Subject } from '@/lib/types';

export async function getGrades(): Promise<Grade[]> {
  const supabase = createClient();
  const { data } = await supabase.from('grades').select('*').order('order');
  return data ?? [];
}

export async function getGradeBySlug(slug: string): Promise<Grade | null> {
  const supabase = createClient();
  const { data } = await supabase.from('grades').select('*').eq('slug', slug).maybeSingle();
  return data;
}

export async function getSubjectsForGrade(gradeId: string): Promise<Subject[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('subjects')
    .select('*')
    .eq('grade_id', gradeId)
    .order('order');
  return data ?? [];
}

/** Subject count per grade, for the /formal landing page cards. */
export async function getSubjectCountsByGrade(): Promise<Record<string, number>> {
  const supabase = createClient();
  const { data } = await supabase.from('subjects').select('grade_id');
  const counts: Record<string, number> = {};
  (data ?? []).forEach((row: { grade_id: string }) => {
    counts[row.grade_id] = (counts[row.grade_id] ?? 0) + 1;
  });
  return counts;
}
