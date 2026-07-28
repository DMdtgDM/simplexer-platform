import { createClient } from '@/lib/supabase/server';
import type { Course } from '@/lib/types';

/** A teacher's own course submissions, any status. */
export async function getMySubmittedCourses(userId: string): Promise<Course[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('courses')
    .select('*')
    .eq('submitted_by', userId)
    .order('order', { ascending: false });
  return data ?? [];
}

/**
 * "N students started, M finished" per course, for the teacher's own
 * approved courses. "Started" = at least one lesson completed; "finished" =
 * every lesson in the course completed. Only counts approved courses since
 * pending/rejected ones have no real audience yet.
 */
export async function getCourseAnalytics(
  courseIds: string[]
): Promise<Record<string, { started: number; finished: number; lessonCount: number }>> {
  const result: Record<string, { started: number; finished: number; lessonCount: number }> = {};
  if (courseIds.length === 0) return result;

  const supabase = createClient();
  const { data: lessons } = await supabase.from('lessons').select('id, course_id').in('course_id', courseIds);
  const lessonsByCourse: Record<string, string[]> = {};
  (lessons ?? []).forEach((l: { id: string; course_id: string }) => {
    (lessonsByCourse[l.course_id] ??= []).push(l.id);
  });

  const allLessonIds = (lessons ?? []).map((l: { id: string }) => l.id);
  if (allLessonIds.length === 0) {
    courseIds.forEach((id) => (result[id] = { started: 0, finished: 0, lessonCount: 0 }));
    return result;
  }

  const { data: progress } = await supabase
    .from('progress')
    .select('user_id, lesson_id')
    .eq('completed', true)
    .in('lesson_id', allLessonIds);

  const completedLessonsByUserAndCourse: Record<string, Set<string>> = {};
  const lessonToCourse: Record<string, string> = {};
  Object.entries(lessonsByCourse).forEach(([courseId, ids]) => ids.forEach((id) => (lessonToCourse[id] = courseId)));

  (progress ?? []).forEach((p: { user_id: string; lesson_id: string }) => {
    const courseId = lessonToCourse[p.lesson_id];
    if (!courseId) return;
    const key = `${courseId}:${p.user_id}`;
    (completedLessonsByUserAndCourse[key] ??= new Set()).add(p.lesson_id);
  });

  courseIds.forEach((courseId) => {
    const lessonCount = lessonsByCourse[courseId]?.length ?? 0;
    let started = 0;
    let finished = 0;
    Object.entries(completedLessonsByUserAndCourse).forEach(([key, completedSet]) => {
      if (!key.startsWith(`${courseId}:`)) return;
      started += 1;
      if (lessonCount > 0 && completedSet.size >= lessonCount) finished += 1;
    });
    result[courseId] = { started, finished, lessonCount };
  });

  return result;
}

/** All pending courses awaiting admin review. */
export async function getPendingCourses(): Promise<(Course & { submitter_name: string | null })[]> {
  const supabase = createClient();
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('status', 'pending')
    .order('order', { ascending: true });

  if (!courses || courses.length === 0) return [];

  const submitterIds = [...new Set(courses.map((c: Course) => c.submitted_by).filter(Boolean))] as string[];
  const nameMap: Record<string, string> = {};
  if (submitterIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id, name').in('id', submitterIds);
    (users ?? []).forEach((u: { id: string; name: string }) => {
      nameMap[u.id] = u.name;
    });
  }

  return courses.map((c: Course) => ({
    ...c,
    submitter_name: c.submitted_by ? nameMap[c.submitted_by] ?? null : null,
  }));
}

/** Every user, for the admin "manage roles" screen. */
export async function getAllUsers() {
  const supabase = createClient();
  const { data } = await supabase.from('users').select('id, name, email, role, created_at').order('created_at', {
    ascending: false,
  });
  return data ?? [];
}

/** Subjects a teacher has been assigned to (for the /teach Formal Track tab). */
export async function getMyTeachingAssignments(teacherId: string) {
  const supabase = createClient();
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('id, subject_id')
    .eq('teacher_id', teacherId);

  if (!assignments || assignments.length === 0) return [];

  const subjectIds = assignments.map((a: { subject_id: string }) => a.subject_id);
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, slug, grade_id')
    .in('id', subjectIds);

  const gradeIds = [...new Set((subjects ?? []).map((s: { grade_id: string }) => s.grade_id))];
  const { data: grades } = await supabase.from('grades').select('id, name').in('id', gradeIds);
  const gradeNameMap: Record<string, string> = {};
  (grades ?? []).forEach((g: { id: string; name: string }) => {
    gradeNameMap[g.id] = g.name;
  });

  return (subjects ?? []).map((s: { id: string; name: string; slug: string; grade_id: string }) => ({
    subjectId: s.id,
    subjectName: s.name,
    gradeName: gradeNameMap[s.grade_id] ?? 'Unknown grade',
  }));
}

/** All teacher_assignments joined with names, for the admin "Assign" panel. */
export async function getAllTeachingAssignments() {
  const supabase = createClient();
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('id, teacher_id, subject_id, created_at')
    .order('created_at', { ascending: false });

  if (!assignments || assignments.length === 0) return [];

  const teacherIds = [...new Set(assignments.map((a: { teacher_id: string }) => a.teacher_id))];
  const subjectIds = [...new Set(assignments.map((a: { subject_id: string }) => a.subject_id))];

  const supabase2 = createClient();
  const [{ data: teachers }, { data: subjects }] = await Promise.all([
    supabase2.from('users').select('id, name').in('id', teacherIds),
    supabase2.from('subjects').select('id, name, grade_id').in('id', subjectIds),
  ]);

  const gradeIds = [...new Set((subjects ?? []).map((s: { grade_id: string }) => s.grade_id))];
  const { data: grades } = await supabase2.from('grades').select('id, name').in('id', gradeIds);

  const teacherNameMap: Record<string, string> = {};
  (teachers ?? []).forEach((t: { id: string; name: string }) => (teacherNameMap[t.id] = t.name));
  const gradeNameMap: Record<string, string> = {};
  (grades ?? []).forEach((g: { id: string; name: string }) => (gradeNameMap[g.id] = g.name));
  const subjectMap: Record<string, { name: string; gradeId: string }> = {};
  (subjects ?? []).forEach((s: { id: string; name: string; grade_id: string }) => {
    subjectMap[s.id] = { name: s.name, gradeId: s.grade_id };
  });

  return assignments.map((a: { id: string; teacher_id: string; subject_id: string }) => ({
    id: a.id,
    teacherName: teacherNameMap[a.teacher_id] ?? 'Unknown',
    subjectName: subjectMap[a.subject_id]?.name ?? 'Unknown subject',
    gradeName: gradeNameMap[subjectMap[a.subject_id]?.gradeId] ?? 'Unknown grade',
  }));
}

/** Pending Formal Track lessons (individually submitted) awaiting review. */
export async function getPendingFormalLessons() {
  const supabase = createClient();
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, topic_id, submitted_by')
    .eq('status', 'pending')
    .not('topic_id', 'is', null);

  if (!lessons || lessons.length === 0) return [];

  const topicIds = [...new Set(lessons.map((l: { topic_id: string }) => l.topic_id))];
  const submitterIds = [...new Set(lessons.map((l: { submitted_by: string }) => l.submitted_by).filter(Boolean))];

  const [{ data: topics }, { data: users }] = await Promise.all([
    supabase.from('topics').select('id, name, subject_id').in('id', topicIds),
    submitterIds.length > 0
      ? supabase.from('users').select('id, name').in('id', submitterIds)
      : Promise.resolve({ data: [] }),
  ]);

  const topicMap: Record<string, string> = {};
  (topics ?? []).forEach((t: { id: string; name: string }) => (topicMap[t.id] = t.name));
  const userMap: Record<string, string> = {};
  (users ?? []).forEach((u: { id: string; name: string }) => (userMap[u.id] = u.name));

  return lessons.map((l: { id: string; title: string; topic_id: string; submitted_by: string | null }) => ({
    id: l.id,
    title: l.title,
    topicName: topicMap[l.topic_id] ?? 'Unknown topic',
    submitterName: l.submitted_by ? userMap[l.submitted_by] ?? 'Unknown' : 'Unknown',
  }));
}

/** A teacher's own Formal Track lesson submissions, any status. */
export async function getMyFormalLessonSubmissions(userId: string) {
  const supabase = createClient();
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, topic_id, status, rejection_reason')
    .eq('submitted_by', userId)
    .not('topic_id', 'is', null)
    .order('created_at', { ascending: false });

  if (!lessons || lessons.length === 0) return [];

  const topicIds = [...new Set(lessons.map((l: { topic_id: string }) => l.topic_id))];
  const { data: topics } = await supabase.from('topics').select('id, name').in('id', topicIds);
  const topicMap: Record<string, string> = {};
  (topics ?? []).forEach((t: { id: string; name: string }) => (topicMap[t.id] = t.name));

  return lessons.map((l: { id: string; title: string; topic_id: string; status: string; rejection_reason: string | null }) => ({
    ...l,
    topicName: topicMap[l.topic_id] ?? 'Unknown topic',
  }));
}
