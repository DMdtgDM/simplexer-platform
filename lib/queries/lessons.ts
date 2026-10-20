import { createClient } from '@/lib/supabase/server';
import type { Lesson } from '@/lib/types';

export async function getLessonsForTopic(topicId: string): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('lessons')
    .select('*')
    .eq('topic_id', topicId)
    .order('order');
  return data ?? [];
}

export async function getLessonsForCourse(courseId: string): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('order');
  return data ?? [];
}

export async function getLessonById(id: string): Promise<Lesson | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('lessons').select('*').eq('id', id).maybeSingle();
  return data;
}

/** Recently published lessons for the homepage "featured" strip. */
export async function getRecentLessons(limit = 4): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('lessons')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/** Fetches the quiz attached to a lesson, if any (id + title only, for the CTA). */
export async function getQuizForLesson(lessonId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('quizzes')
    .select('id, title')
    .eq('lesson_id', lessonId)
    .maybeSingle();
  return data;
}

export type LessonBreadcrumb =
  | {
      track: 'formal';
      grade: { name: string; slug: string };
      subject: { name: string; slug: string };
      topic: { id: string; name: string; slug: string };
    }
  | {
      track: 'interest';
      category: { name: string; slug: string };
      course: { id: string; title: string; slug: string };
    };

export async function getLessonBreadcrumb(lesson: Lesson): Promise<LessonBreadcrumb | null> {
  const supabase = await createClient();

  if (lesson.topic_id) {
    const { data: topic } = await supabase
      .from('topics')
      .select('id, name, slug, subject_id')
      .eq('id', lesson.topic_id)
      .maybeSingle();
    if (!topic) return null;
    const { data: subject } = await supabase
      .from('subjects')
      .select('name, slug, grade_id')
      .eq('id', topic.subject_id)
      .maybeSingle();
    if (!subject) return null;
    const { data: grade } = await supabase
      .from('grades')
      .select('name, slug')
      .eq('id', subject.grade_id)
      .maybeSingle();
    if (!grade) return null;

    return {
      track: 'formal',
      grade: { name: grade.name, slug: grade.slug },
      subject: { name: subject.name, slug: subject.slug },
      topic: { id: topic.id, name: topic.name, slug: topic.slug },
    };
  }

  if (lesson.course_id) {
    const { data: course } = await supabase
      .from('courses')
      .select('id, title, slug, category_id')
      .eq('id', lesson.course_id)
      .maybeSingle();
    if (!course) return null;
    const { data: category } = await supabase
      .from('categories')
      .select('name, slug')
      .eq('id', course.category_id)
      .maybeSingle();
    if (!category) return null;

    return {
      track: 'interest',
      category: { name: category.name, slug: category.slug },
      course: { id: course.id, title: course.title, slug: course.slug },
    };
  }

  return null;
}

export type NextTopicSuggestion = {
  topicName: string;
  firstLessonId: string;
  gradeSlug: string;
  subjectSlug: string;
  topicSlug: string;
};

/**
 * When a lesson is the last one in its (Formal Track) topic, this finds the
 * first lesson of the *next* topic in the same subject, so the lesson page
 * can offer "since you finished X, try Y" instead of a dead-end "Next".
 * Returns null for Interest Track lessons, or if this topic is already the
 * last one in its subject.
 */
export async function getNextTopicSuggestion(lesson: Lesson): Promise<NextTopicSuggestion | null> {
  if (!lesson.topic_id) return null;
  const supabase = await createClient();

  const { data: topic } = await supabase
    .from('topics')
    .select('id, subject_id, order')
    .eq('id', lesson.topic_id)
    .maybeSingle();
  if (!topic) return null;

  const { data: subject } = await supabase
    .from('subjects')
    .select('id, slug, grade_id')
    .eq('id', topic.subject_id)
    .maybeSingle();
  if (!subject) return null;

  const { data: grade } = await supabase.from('grades').select('slug').eq('id', subject.grade_id).maybeSingle();
  if (!grade) return null;

  const { data: nextTopic } = await supabase
    .from('topics')
    .select('id, name, slug, order')
    .eq('subject_id', subject.id)
    .gt('order', topic.order)
    .order('order', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!nextTopic) return null;

  const { data: firstLesson } = await supabase
    .from('lessons')
    .select('id')
    .eq('topic_id', nextTopic.id)
    .order('order', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!firstLesson) return null;

  return {
    topicName: nextTopic.name,
    firstLessonId: firstLesson.id,
    gradeSlug: grade.slug,
    subjectSlug: subject.slug,
    topicSlug: nextTopic.slug,
  };
}

/** Previous/next lesson within the same topic or course, ordered by `order`. */
export async function getAdjacentLessons(
  lesson: Lesson
): Promise<{ prev: Lesson | null; next: Lesson | null }> {
  const siblings = lesson.topic_id
    ? await getLessonsForTopic(lesson.topic_id)
    : lesson.course_id
      ? await getLessonsForCourse(lesson.course_id)
      : [];

  const idx = siblings.findIndex((l) => l.id === lesson.id);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? siblings[idx - 1] : null,
    next: idx < siblings.length - 1 ? siblings[idx + 1] : null,
  };
}
