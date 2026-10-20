import { notFound } from 'next/navigation';
import { getGradeBySlug, getSubjectsForGrade } from '@/lib/queries/grades';
import { getSubjectCompletion, getTopicsForSubject } from '@/lib/queries/subjects';
import { getCurrentUser } from '@/lib/queries/progress';
import { SubjectListContent } from './SubjectListContent';

export const revalidate = 300;

export default async function GradePage(props: { params: Promise<{ grade: string }> }) {
  const params = await props.params;
  const grade = await getGradeBySlug(params.grade);
  if (!grade) notFound();

  const [subjects, user] = await Promise.all([getSubjectsForGrade(grade.id), getCurrentUser()]);

  const topicCounts: Record<string, number> = {};
  const [, completion] = await Promise.all([
    Promise.all(
      subjects.map(async (s) => {
        const topics = await getTopicsForSubject(s.id);
        topicCounts[s.id] = topics.length;
      })
    ),
    user ? getSubjectCompletion(grade.id, user.authUser.id) : Promise.resolve({}),
  ]);

  return (
    <SubjectListContent
      grade={grade}
      subjects={subjects}
      topicCounts={topicCounts}
      completion={completion}
      loggedIn={Boolean(user)}
    />
  );
}
