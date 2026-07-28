import { redirect } from 'next/navigation';
import { getCurrentUser, getCompletedLessonDetails, getQuizAttemptDetails } from '@/lib/queries/progress';
import { ProgressDetailContent } from './ProgressDetailContent';

export const metadata = { title: 'My Progress — Simplexer' };

export default async function ProgressDetailPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [lessons, attempts] = await Promise.all([
    getCompletedLessonDetails(user.authUser.id),
    getQuizAttemptDetails(user.authUser.id),
  ]);

  return <ProgressDetailContent lessons={lessons} attempts={attempts} />;
}
