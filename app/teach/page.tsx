import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { getCategories } from '@/lib/queries/courses';
import {
  getMySubmittedCourses,
  getCourseAnalytics,
  getMyTeachingAssignments,
  getMyFormalLessonSubmissions,
} from '@/lib/queries/admin';
import { getTopicsForSubject } from '@/lib/queries/subjects';
import { TeachContent } from './TeachContent';

export const metadata = { title: 'Teach — Simplexer' };

export default async function TeachPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (!user.profile || (user.profile.role !== 'teacher' && user.profile.role !== 'admin')) {
    return (
      <div className="pt-10 text-center">
        <h1 className="font-heading text-xl font-bold text-textneutral">Teacher access required</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
          Course submission is limited to approved teachers. Contact the Simplexer team if you'd like
          to teach a course — they can promote your account.
        </p>
      </div>
    );
  }

  const [categories, mySubmissions, assignments, myFormalLessons] = await Promise.all([
    getCategories(),
    getMySubmittedCourses(user.authUser.id),
    getMyTeachingAssignments(user.authUser.id),
    getMyFormalLessonSubmissions(user.authUser.id),
  ]);

  const approvedIds = mySubmissions.filter((c) => c.status === 'approved').map((c) => c.id);
  const analytics = await getCourseAnalytics(approvedIds);

  const topicsBySubject: Record<string, { id: string; name: string }[]> = {};
  await Promise.all(
    assignments.map(async (a) => {
      const topics = await getTopicsForSubject(a.subjectId);
      topicsBySubject[a.subjectId] = topics.map((t) => ({ id: t.id, name: t.name }));
    })
  );

  return (
    <TeachContent
      categories={categories}
      mySubmissions={mySubmissions}
      analytics={analytics}
      assignments={assignments}
      topicsBySubject={topicsBySubject}
      myFormalLessons={myFormalLessons}
    />
  );
}
