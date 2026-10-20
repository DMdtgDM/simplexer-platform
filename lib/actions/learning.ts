'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Logs "this user did something today" for the streak counter. Upserts on
 * (user_id, activity_date) so calling it many times in one day is a no-op
 * after the first. Never throws — a failed streak log shouldn't break the
 * action that triggered it.
 */
async function logActivity(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from('daily_activity')
    .upsert({ user_id: userId, activity_date: today }, { onConflict: 'user_id,activity_date', ignoreDuplicates: true });
}

export async function markLessonComplete(lessonId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in to track progress.');

  await supabase.from('progress').upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,lesson_id' }
  );
  await logActivity(supabase, user.id);

  revalidatePath(`/lesson/${lessonId}`);
  revalidatePath('/profile');
  revalidatePath('/profile/progress');
}

export async function toggleBookmark(lessonId: string, currentlyBookmarked: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in to save lessons.');

  if (currentlyBookmarked) {
    await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('lesson_id', lessonId);
  } else {
    await supabase
      .from('bookmarks')
      .upsert({ user_id: user.id, lesson_id: lessonId }, { onConflict: 'user_id,lesson_id' });
  }

  revalidatePath(`/lesson/${lessonId}`);
  revalidatePath('/profile/bookmarks');
}

export async function submitQuiz(quizId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in to submit a quiz.');

  // Answers only are sent to the database. grade_quiz() owns the answer key,
  // scores the attempt, records progress and logs today's activity.
  const answers: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('q_') && typeof value === 'string' && value.trim()) answers[key.slice(2)] = value;
  }

  const { data: attemptId, error } = await supabase.rpc('grade_quiz', {
    p_quiz_id: quizId,
    p_answers: answers,
  });
  if (error || !attemptId) throw new Error(error?.message ?? 'Could not grade this quiz. Please try again.');

  revalidatePath('/profile');
  redirect(`/quiz/${quizId}/results?attempt=${attemptId}`);
}

