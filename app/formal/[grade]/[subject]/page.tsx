import { notFound } from 'next/navigation';
import { getGradeBySlug } from '@/lib/queries/grades';
import { getSubjectBySlug, getTopicsForSubject, getLessonCountsByTopic } from '@/lib/queries/subjects';
import { getCurrentUser } from '@/lib/queries/progress';
import { TopicListContent } from './TopicListContent';

export const revalidate = 300;

export default async function SubjectPage(
  props: {
    params: Promise<{ grade: string; subject: string }>;
  }
) {
  const params = await props.params;
  const grade = await getGradeBySlug(params.grade);
  if (!grade) notFound();

  const subject = await getSubjectBySlug(grade.id, params.subject);
  if (!subject) notFound();

  const [topics, lessonCounts, user] = await Promise.all([
    getTopicsForSubject(subject.id),
    getLessonCountsByTopic(subject.id),
    getCurrentUser(),
  ]);

  return (
    <TopicListContent
      grade={grade}
      subject={subject}
      topics={topics}
      lessonCounts={lessonCounts}
      loggedIn={Boolean(user)}
    />
  );
}
