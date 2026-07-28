import { createClient } from '@/lib/supabase/server';
import type { Question, Quiz } from '@/lib/types';

export async function getQuizById(id: string): Promise<Quiz | null> {
  const supabase = createClient();
  const { data } = await supabase.from('quizzes').select('*').eq('id', id).maybeSingle();
  return data;
}

export async function getQuestionsForQuiz(quizId: string): Promise<Question[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('questions')
    .select('*, question_options(*)')
    .eq('quiz_id', quizId)
    .order('order');

  return (data ?? []).map((q: Question) => ({
    ...q,
    question_options: [...q.question_options].sort((a, b) => a.order - b.order),
  }));
}
