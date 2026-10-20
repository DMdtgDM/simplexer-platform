import { redirect } from 'next/navigation';
import { getCurrentUser, getProgressForUser, getQuizAttemptsForUser } from '@/lib/queries/progress';
import { getGrades } from '@/lib/queries/grades';
import { getStreakForUser } from '@/lib/queries/activity';
import { ProfileContent } from './ProfileContent';
import { ProfileSettings } from '@/components/ProfileSettings';

export const metadata = { title: 'Profile — Simplexer' };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [progress, attempts, grades, streak] = await Promise.all([
    getProgressForUser(user.authUser.id),
    getQuizAttemptsForUser(user.authUser.id),
    getGrades(),
    getStreakForUser(user.authUser.id),
  ]);

  const completedLessons = progress.filter((p) => p.completed).length;
  const grade = grades.find((g) => g.id === user.profile?.grade_id) ?? null;

  return (
    <>
    <ProfileContent
      profile={user.profile}
      email={user.authUser.email ?? ''}
      gradeName={grade?.name ?? null}
      examDate={grade?.exam_date ?? null}
      completedLessons={completedLessons}
      quizAttempts={attempts}
      streak={streak}
    />
    <ProfileSettings profile={user.profile} />
    </>
  );
}
