'use server';

import { createClient } from '@/lib/supabase/server';
import { getQuestionsForQuiz } from '@/lib/queries/quizzes';
import { slugify } from '@/lib/slugify';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Logs "this user did something today" for the streak counter. Upserts on
 * (user_id, activity_date) so calling it many times in one day is a no-op
 * after the first. Never throws — a failed streak log shouldn't break the
 * action that triggered it.
 */
async function logActivity(supabase: ReturnType<typeof createClient>, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from('daily_activity')
    .upsert({ user_id: userId, activity_date: today }, { onConflict: 'user_id,activity_date', ignoreDuplicates: true });
}

export async function markLessonComplete(lessonId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in to track progress.');

  await supabase.from('progress').upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,lesson_id' }
  );
  await logActivity(supabase, user.id);

  revalidatePath(`/lesson/${lessonId}`);
  revalidatePath('/profile');
  revalidatePath('/profile/progress');
}

export async function toggleBookmark(lessonId: string, currentlyBookmarked: boolean) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in to save lessons.');

  if (currentlyBookmarked) {
    await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('lesson_id', lessonId);
  } else {
    await supabase
      .from('bookmarks')
      .upsert({ user_id: user.id, lesson_id: lessonId }, { onConflict: 'user_id,lesson_id' });
  }

  revalidatePath(`/lesson/${lessonId}`);
  revalidatePath('/profile/bookmarks');
}

export async function submitQuiz(quizId: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in to submit a quiz.');

  const questions = await getQuestionsForQuiz(quizId);

  let score = 0;
  const answers: Record<string, string> = {};

  for (const q of questions) {
    const selected = formData.get(`q_${q.id}`) as string | null;
    if (selected) {
      answers[q.id] = selected;
      const correctOption = q.question_options.find((o) => o.is_correct);
      if (correctOption && correctOption.id === selected) score += 1;
    }
  }

  const { data: attempt } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: user.id,
      quiz_id: quizId,
      score,
      total: questions.length,
      answers,
    })
    .select('id')
    .single();

  // If the quiz is attached to a lesson, also mark that lesson complete.
  const { data: quiz } = await supabase.from('quizzes').select('lesson_id').eq('id', quizId).maybeSingle();
  if (quiz?.lesson_id) {
    await supabase.from('progress').upsert(
      {
        user_id: user.id,
        lesson_id: quiz.lesson_id,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    );
  }
  await logActivity(supabase, user.id);

  revalidatePath('/profile');
  redirect(`/quiz/${quizId}/results?attempt=${attempt?.id}`);
}

// ---------------------------------------------------------------------------
// Teacher course submission + admin review queue
// ---------------------------------------------------------------------------

type LessonDraft = { title: string; content: string; video_url: string };

export async function submitCourseForReview(input: {
  categoryId: string;
  title: string;
  slug: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructor: string;
  coverImageUrl: string;
  lessons: LessonDraft[];
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in.');

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
    throw new Error('Only teachers can submit courses.');
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .insert({
      category_id: input.categoryId,
      title: input.title,
      slug: input.slug,
      description: input.description,
      difficulty: input.difficulty,
      instructor: input.instructor,
      cover_image_url: input.coverImageUrl || null,
      status: 'pending',
      submitted_by: user.id,
    })
    .select('id')
    .single();

  if (courseError || !course) {
    throw new Error(courseError?.message ?? 'Could not create course.');
  }

  const lessonRows = input.lessons.map((l, i) => ({
    course_id: course.id,
    slug: `lesson-${i + 1}`,
    title: l.title,
    content: l.content,
    video_url: l.video_url || null,
    order: i + 1,
  }));

  if (lessonRows.length > 0) {
    const { error: lessonError } = await supabase.from('lessons').insert(lessonRows);
    if (lessonError) throw new Error(lessonError.message);
  }

  revalidatePath('/teach');
  redirect('/teach?submitted=1');
}

export async function approveCourse(courseId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('courses').update({ status: 'approved' }).eq('id', courseId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

export async function rejectCourse(courseId: string, reason: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('courses')
    .update({ status: 'rejected', rejection_reason: reason || 'No reason given.' })
    .eq('id', courseId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

export async function promoteUserRole(userId: string, role: 'student' | 'teacher' | 'admin') {
  const supabase = createClient();
  const { error } = await supabase.from('users').update({ role }).eq('id', userId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

// ---------------------------------------------------------------------------
// Course editing / deletion (teacher owns it, or admin)
// ---------------------------------------------------------------------------

export async function updateCourseSubmission(
  courseId: string,
  input: {
    categoryId: string;
    title: string;
    slug: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    instructor: string;
    coverImageUrl?: string;
    lessons: { id?: string; title: string; content: string; video_url: string }[];
  }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in.');

  const { data: existing } = await supabase.from('courses').select('status, submitted_by').eq('id', courseId).maybeSingle();
  if (!existing) throw new Error('Course not found.');

  const isAdmin = (await supabase.from('users').select('role').eq('id', user.id).maybeSingle()).data?.role === 'admin';
  if (existing.submitted_by !== user.id && !isAdmin) throw new Error('Not your course.');

  // Any edit by the owning teacher sends an already-approved course back for
  // re-review, so a live public course can never be silently changed.
  const nextStatus = existing.status === 'approved' && !isAdmin ? 'pending' : existing.status;

  const { error: updateError } = await supabase
    .from('courses')
    .update({
      category_id: input.categoryId,
      title: input.title,
      slug: input.slug,
      description: input.description,
      difficulty: input.difficulty,
      instructor: input.instructor,
      cover_image_url: input.coverImageUrl || null,
      status: nextStatus,
      rejection_reason: nextStatus === 'pending' ? null : existing.status,
    })
    .eq('id', courseId);
  if (updateError) throw new Error(updateError.message);

  // Simplest correct way to handle add/remove/reorder: replace the lesson set.
  const { error: deleteError } = await supabase.from('lessons').delete().eq('course_id', courseId);
  if (deleteError) throw new Error(deleteError.message);

  const lessonRows = input.lessons.map((l, i) => ({
    course_id: courseId,
    slug: `lesson-${i + 1}`,
    title: l.title,
    content: l.content,
    video_url: l.video_url || null,
    order: i + 1,
  }));
  if (lessonRows.length > 0) {
    const { error: insertError } = await supabase.from('lessons').insert(lessonRows);
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath('/teach');
  revalidatePath('/admin');
  redirect('/teach?updated=1');
}

export async function deleteCourseSubmission(courseId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('courses').delete().eq('id', courseId);
  if (error) throw new Error(error.message);
  revalidatePath('/teach');
  revalidatePath('/admin');
}

// ---------------------------------------------------------------------------
// Formal Track lesson submission (teacher must be assigned to the subject)
// ---------------------------------------------------------------------------

export async function submitFormalLesson(input: {
  topicId: string;
  title: string;
  content: string;
  videoUrl: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in.');

  const { error } = await supabase.from('lessons').insert({
    topic_id: input.topicId,
    slug: `${slugify(input.title)}-${Date.now().toString(36)}`,
    title: input.title,
    content: input.content,
    video_url: input.videoUrl || null,
    status: 'pending',
    submitted_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath('/teach');
  redirect('/teach?formal_submitted=1');
}

export async function deleteFormalLesson(lessonId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
  if (error) throw new Error(error.message);
  revalidatePath('/teach');
  revalidatePath('/admin');
}

export async function approveFormalLesson(lessonId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('lessons').update({ status: 'approved' }).eq('id', lessonId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

export async function rejectFormalLesson(lessonId: string, reason: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('lessons')
    .update({ status: 'rejected', rejection_reason: reason || 'No reason given.' })
    .eq('id', lessonId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

// ---------------------------------------------------------------------------
// Admin: teacher-subject assignments + community links
// ---------------------------------------------------------------------------

export async function assignTeacherSubject(teacherId: string, subjectId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('teacher_assignments')
    .insert({ teacher_id: teacherId, subject_id: subjectId });
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

export async function unassignTeacherSubject(assignmentId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('teacher_assignments').delete().eq('id', assignmentId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

export async function addCommunityLink(input: { label: string; url: string; icon: string }) {
  const supabase = createClient();
  const { error } = await supabase.from('community_links').insert({
    label: input.label,
    url: input.url,
    icon: input.icon || null,
    order: 99,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
  revalidatePath('/community');
}

export async function deleteCommunityLink(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('community_links').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
  revalidatePath('/community');
}
