import { notFound } from 'next/navigation';
import { getGradeBySlug } from '@/lib/queries/grades';
import { getSubjectBySlug, getTopicBySlug } from '@/lib/queries/subjects';
import { getLessonsForTopic } from '@/lib/queries/lessons';
import { getCurrentUser, getProgressForLessons } from '@/lib/queries/progress';
import { createClient } from '@/lib/supabase/server';
import { LessonListContent } from './LessonListContent';

export const revalidate = 300;

export default async function TopicPage({
  params,
}: {
  params: { grade: string; subject: string; topic: string };
}) {
  const grade = await getGradeBySlug(params.grade);
  if (!grade) notFound();
  const subject = await getSubjectBySlug(grade.id, params.subject);
  if (!subject) notFound();
  const topic = await getTopicBySlug(subject.id, params.topic);
  if (!topic) notFound();

  const lessons = await getLessonsForTopic(topic.id);

  // which lessons have a quiz attached
  const supabase = createClient();
  const lessonIds = lessons.map((l) => l.id);
  const { data: quizzes } = lessonIds.length
    ? await supabase.from('quizzes').select('lesson_id').in('lesson_id', lessonIds)
    : { data: [] };
  const lessonsWithQuiz = new Set((quizzes ?? []).map((q: { lesson_id: string }) => q.lesson_id));

  const user = await getCurrentUser();
  const progressMap = user ? await getProgressForLessons(user.authUser.id, lessonIds) : {};

  return (
    <LessonListContent
      grade={grade}
      subject={subject}
      topic={topic}
      lessons={lessons}
      lessonsWithQuiz={lessonsWithQuiz}
      progressMap={progressMap}
      loggedIn={Boolean(user)}
    />
  );
}
