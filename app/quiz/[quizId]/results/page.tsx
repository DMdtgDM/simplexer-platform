import { notFound, redirect } from 'next/navigation';
import { getQuizById, getQuestionsForQuiz } from '@/lib/queries/quizzes';
import { getLessonById } from '@/lib/queries/lessons';
import { createClient } from '@/lib/supabase/server';
import { ResultsContent } from './ResultsContent';

export default async function QuizResultsPage({
  params,
  searchParams,
}: {
  params: { quizId: string };
  searchParams: { attempt?: string };
}) {
  const quiz = await getQuizById(params.quizId);
  if (!quiz) notFound();
  if (!searchParams.attempt) redirect(`/quiz/${quiz.id}`);

  const supabase = createClient();
  const { data: attempt } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('id', searchParams.attempt)
    .maybeSingle();

  if (!attempt) notFound(); // RLS also guarantees this is the current user's own attempt

  const questions = await getQuestionsForQuiz(quiz.id);

  let lessonHref = '/';
  if (quiz.lesson_id) {
    const lesson = await getLessonById(quiz.lesson_id);
    if (lesson) lessonHref = `/lesson/${lesson.id}`;
  }

  return <ResultsContent quiz={quiz} attempt={attempt} questions={questions} lessonHref={lessonHref} />;
}
