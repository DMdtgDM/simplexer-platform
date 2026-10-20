import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Progress, QuizAttempt } from '@/lib/types';

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  // getSession reads the signed cookie (no network). Fine for showing/hiding UI;
  // every write is still checked by Supabase row-level security.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
  return { authUser: user, profile };
});

export async function getProgressForUser(userId: string): Promise<Progress[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('progress').select('*').eq('user_id', userId);
  return data ?? [];
}

export async function getProgressForLessons(
  userId: string,
  lessonIds: string[]
): Promise<Record<string, boolean>> {
  if (lessonIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from('progress')
    .select('lesson_id, completed')
    .eq('user_id', userId)
    .in('lesson_id', lessonIds);

  const map: Record<string, boolean> = {};
  (data ?? []).forEach((row: { lesson_id: string; completed: boolean }) => {
    map[row.lesson_id] = row.completed;
  });
  return map;
}

export async function getQuizAttemptsForUser(userId: string): Promise<QuizAttempt[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('user_id', userId)
    .order('attempted_at', { ascending: false });
  return data ?? [];
}

/** Completed lessons joined with lesson title, for the /profile/progress detail view. */
export async function getCompletedLessonDetails(
  userId: string
): Promise<{ lessonId: string; title: string; completedAt: string | null }[]> {
  const supabase = await createClient();
  const { data: progress } = await supabase
    .from('progress')
    .select('lesson_id, completed_at')
    .eq('user_id', userId)
    .eq('completed', true)
    .order('completed_at', { ascending: false });

  const lessonIds = (progress ?? []).map((p: { lesson_id: string }) => p.lesson_id);
  if (lessonIds.length === 0) return [];

  const { data: lessons } = await supabase.from('lessons').select('id, title').in('id', lessonIds);
  const titleMap: Record<string, string> = {};
  (lessons ?? []).forEach((l: { id: string; title: string }) => {
    titleMap[l.id] = l.title;
  });

  return (progress ?? []).map((p: { lesson_id: string; completed_at: string | null }) => ({
    lessonId: p.lesson_id,
    title: titleMap[p.lesson_id] ?? 'Untitled lesson',
    completedAt: p.completed_at,
  }));
}

/** Quiz attempts joined with quiz title, for the /profile/progress detail view. */
export async function getQuizAttemptDetails(
  userId: string
): Promise<(QuizAttempt & { quizTitle: string })[]> {
  const attempts = await getQuizAttemptsForUser(userId);
  if (attempts.length === 0) return [];

  const supabase = await createClient();
  const quizIds = [...new Set(attempts.map((a) => a.quiz_id))];
  const { data: quizzes } = await supabase.from('quizzes').select('id, title').in('id', quizIds);
  const titleMap: Record<string, string> = {};
  (quizzes ?? []).forEach((q: { id: string; title: string }) => {
    titleMap[q.id] = q.title;
  });

  return attempts.map((a) => ({ ...a, quizTitle: titleMap[a.quiz_id] ?? 'Untitled quiz' }));
}
