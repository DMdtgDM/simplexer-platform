import { notFound, redirect } from 'next/navigation';
import { getQuizById, getQuizReview } from '@/lib/queries/quizzes';
import { getLessonById } from '@/lib/queries/lessons';
import { createClient } from '@/lib/supabase/server';
import { ResultsContent } from './ResultsContent';

export default async function QuizResultsPage(
  props: {
    params: Promise<{ quizId: string }>;
    searchParams: Promise<{ attempt?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const quiz = await getQuizById(params.quizId);
  if (!quiz) notFound();
  if (!searchParams.attempt) redirect(`/quiz/${quiz.id}`);

  const supabase = await createClient();
  const { data: attempt } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('id', searchParams.attempt)
    .maybeSingle();

  if (!attempt || attempt.quiz_id !== quiz.id) notFound(); // RLS also guarantees this is the current user's own attempt

  // Correct answers come from quiz_review(), which only serves the attempt's owner.
  const questions = await getQuizReview(attempt.id);

  let lessonHref = '/';
  if (quiz.lesson_id) {
    const lesson = await getLessonById(quiz.lesson_id);
    if (lesson) lessonHref = `/lesson/${lesson.id}`;
  }

  return <ResultsContent quiz={quiz} attempt={attempt} questions={questions} lessonHref={lessonHref} />;
}
