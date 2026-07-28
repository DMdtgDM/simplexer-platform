import { notFound } from 'next/navigation';
import { getGradeBySlug, getSubjectsForGrade } from '@/lib/queries/grades';
import { getSubjectCompletion, getTopicsForSubject } from '@/lib/queries/subjects';
import { getCurrentUser } from '@/lib/queries/progress';
import { SubjectListContent } from './SubjectListContent';

export const revalidate = 300;

export default async function GradePage({ params }: { params: { grade: string } }) {
  const grade = await getGradeBySlug(params.grade);
  if (!grade) notFound();

  const subjects = await getSubjectsForGrade(grade.id);

  // topic counts per subject
  const topicCounts: Record<string, number> = {};
  await Promise.all(
    subjects.map(async (s) => {
      const topics = await getTopicsForSubject(s.id);
      topicCounts[s.id] = topics.length;
    })
  );

  const user = await getCurrentUser();
  const completion = user ? await getSubjectCompletion(grade.id, user.authUser.id) : {};

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
