import { notFound } from 'next/navigation';
import { getQuizById, getQuestionsForQuiz } from '@/lib/queries/quizzes';
import { getLessonById, getLessonBreadcrumb } from '@/lib/queries/lessons';
import { getCurrentUser } from '@/lib/queries/progress';
import { submitQuiz } from '@/lib/actions';
import { QuizPageContent } from './QuizPageContent';

export const revalidate = 300;

export default async function QuizPage({ params }: { params: { quizId: string } }) {
  const quiz = await getQuizById(params.quizId);
  if (!quiz) notFound();

  const questions = await getQuestionsForQuiz(quiz.id);
  const user = await getCurrentUser();

  let backHref = '/';
  if (quiz.lesson_id) {
    const lesson = await getLessonById(quiz.lesson_id);
    if (lesson) {
      backHref = `/lesson/${lesson.id}`;
    }
  }

  const action = submitQuiz.bind(null, quiz.id);

  return (
    <QuizPageContent
      quiz={quiz}
      questions={questions}
      loggedIn={Boolean(user)}
      backHref={backHref}
      action={action}
    />
  );
}
