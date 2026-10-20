import { ReportButton } from '@/components/ReportButton';
import { notFound } from 'next/navigation';
import {
  getLessonById,
  getQuizForLesson,
  getLessonBreadcrumb,
  getAdjacentLessons,
  getNextTopicSuggestion,
} from '@/lib/queries/lessons';
import { getCurrentUser, getProgressForLessons } from '@/lib/queries/progress';
import { getBookmarkedLessonIds } from '@/lib/queries/bookmarks';
import { LessonPageContent } from './LessonPageContent';

export const revalidate = 300;

export default async function LessonPage(props: { params: Promise<{ lessonId: string }> }) {
  const params = await props.params;
  const lesson = await getLessonById(params.lessonId);
  if (!lesson) notFound();

  const [breadcrumb, quiz, adjacent, user] = await Promise.all([
    getLessonBreadcrumb(lesson),
    getQuizForLesson(lesson.id),
    getAdjacentLessons(lesson),
    getCurrentUser(),
  ]);

  const progressMap = user ? await getProgressForLessons(user.authUser.id, [lesson.id]) : {};
  const completed = Boolean(progressMap[lesson.id]);
  const bookmarked = user ? (await getBookmarkedLessonIds(user.authUser.id)).has(lesson.id) : false;
  const nextTopic = adjacent.next ? null : await getNextTopicSuggestion(lesson);

  return (
    <>
    <LessonPageContent
      lesson={lesson}
      breadcrumb={breadcrumb}
      quiz={quiz}
      adjacent={adjacent}
      nextTopic={nextTopic}
      loggedIn={Boolean(user)}
      completed={completed}
      bookmarked={bookmarked}
    />
    <ReportButton kind="lesson" target={lesson.id} />
    </>
  );
}
