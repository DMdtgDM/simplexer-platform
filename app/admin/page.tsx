import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { getPendingCourses, getAllUsers, getPendingFormalLessons, getAllTeachingAssignments } from '@/lib/queries/admin';
import { getLessonsForCourse } from '@/lib/queries/lessons';
import { getGrades, getSubjectsForGrade } from '@/lib/queries/grades';
import { getCommunityLinks } from '@/lib/queries/community';
import { createClient } from '@/lib/supabase/server';
import { AdminContent } from './AdminContent';

export const metadata = { title: 'Admin — Simplexer' };

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.profile || user.profile.role !== 'admin') {
    return (
      <div className="pt-10 text-center">
        <h1 className="font-heading text-xl font-bold text-textneutral">Admins only</h1>
        <p className="mt-2 text-sm text-gray-500">You don't have access to this page.</p>
      </div>
    );
  }

  const [pendingCourses, users, pendingFormalLessons, assignments, grades, links] = await Promise.all([
    getPendingCourses(),
    getAllUsers(),
    getPendingFormalLessons(),
    getAllTeachingAssignments(),
    getGrades(),
    getCommunityLinks(),
  ]);

  const lessonsByCourse: Record<string, { title: string }[]> = {};
  await Promise.all(
    pendingCourses.map(async (c) => {
      const lessons = await getLessonsForCourse(c.id);
      lessonsByCourse[c.id] = lessons.map((l) => ({ title: l.title }));
    })
  );

  // subjects grouped by grade, for the "assign teacher" dropdown
  const subjectsByGrade: Record<string, { id: string; name: string }[]> = {};
  await Promise.all(
    grades.map(async (g) => {
      const subjects = await getSubjectsForGrade(g.id);
      subjectsByGrade[g.id] = subjects.map((s) => ({ id: s.id, name: s.name }));
    })
  );

  const teachers = users.filter((u) => u.role === 'teacher' || u.role === 'admin');

  return (
    <AdminContent
      pendingCourses={pendingCourses}
      lessonsByCourse={lessonsByCourse}
      users={users}
      currentUserId={user.authUser.id}
      pendingFormalLessons={pendingFormalLessons}
      assignments={assignments}
      grades={grades}
      subjectsByGrade={subjectsByGrade}
      teachers={teachers}
      links={links}
    />
  );
}
