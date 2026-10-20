import { createClient } from '@/lib/supabase/server';
import type { Question, Quiz } from '@/lib/types';

export async function getQuizById(id: string): Promise<Quiz | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('quizzes').select('*').eq('id', id).maybeSingle();
  return data;
}

/**
 * Student-safe question list for TAKING a quiz. It deliberately selects only
 * the columns a student may see: no is_correct, no correct_text, no answers
 * table. Grading happens in the grade_quiz() database function.
 */
export async function getQuestionsForQuiz(quizId: string): Promise<Question[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('questions')
    .select('id, quiz_id, question_text, order, question_type, question_options(id, question_id, option_text, order)')
    .eq('quiz_id', quizId)
    .order('order');

  type Raw = Omit<Question, 'explanation'> & { explanation?: string | null };
  return ((data ?? []) as unknown as Raw[]).map((q) => ({
    ...q,
    explanation: null, // explanations are part of the review, not the live quiz
    correct_text: null,
    question_options: [...(q.question_options ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((o) => ({ ...o, is_correct: false })),
  }));
}

/**
 * Full review for the owner of one finished attempt (correct options and
 * short-answer keys included). Enforced inside quiz_review(): it raises for
 * anyone who does not own the attempt.
 */
export async function getQuizReview(attemptId: string): Promise<Question[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('quiz_review', { p_attempt_id: attemptId });
  if (error || !Array.isArray(data)) return [];
  return data as Question[];
}
