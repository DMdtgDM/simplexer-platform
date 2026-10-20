import { createPublicClient as createClient } from '@/lib/supabase/public';
import { createClient as createUserClient } from '@/lib/supabase/server';
import type { Subject, Topic } from '@/lib/types';

export async function getSubjectBySlug(gradeId: string, slug: string): Promise<Subject | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subjects')
    .select('*')
    .eq('grade_id', gradeId)
    .eq('slug', slug)
    .maybeSingle();
  return data;
}

export async function getTopicsForSubject(subjectId: string): Promise<Topic[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('topics')
    .select('*')
    .eq('subject_id', subjectId)
    .order('order');
  return data ?? [];
}

export async function getTopicBySlug(subjectId: string, slug: string): Promise<Topic | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('topics')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('slug', slug)
    .maybeSingle();
  return data;
}

/** Lesson count per topic, for the topic-list page. */
export async function getLessonCountsByTopic(subjectId: string): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data: topics } = await supabase.from('topics').select('id').eq('subject_id', subjectId);
  const topicIds = (topics ?? []).map((t: { id: string }) => t.id);
  if (topicIds.length === 0) return {};
  const { data } = await supabase.from('lessons').select('topic_id').in('topic_id', topicIds);
  const counts: Record<string, number> = {};
  (data ?? []).forEach((row: { topic_id: string }) => {
    counts[row.topic_id] = (counts[row.topic_id] ?? 0) + 1;
  });
  return counts;
}

/**
 * Completion % per subject for a grade, used on the /formal/[grade] subject
 * list (§9.3 "completion % if logged in"). Walks subjects -> topics -> lessons
 * -> progress and aggregates in JS since it spans three joins.
 */
export async function getSubjectCompletion(
  gradeId: string,
  userId: string
): Promise<Record<string, { total: number; completed: number }>> {
  const supabase = await createUserClient();

  const { data: subjects } = await supabase.from('subjects').select('id').eq('grade_id', gradeId);
  const subjectIds = (subjects ?? []).map((s: { id: string }) => s.id);
  if (subjectIds.length === 0) return {};

  const { data: topics } = await supabase
    .from('topics')
    .select('id, subject_id')
    .in('subject_id', subjectIds);
  const topicToSubject: Record<string, string> = {};
  (topics ?? []).forEach((t: { id: string; subject_id: string }) => {
    topicToSubject[t.id] = t.subject_id;
  });
  const topicIds = Object.keys(topicToSubject);
  if (topicIds.length === 0) return {};

  const { data: lessons } = await supabase.from('lessons').select('id, topic_id').in('topic_id', topicIds);
  const lessonToSubject: Record<string, string> = {};
  (lessons ?? []).forEach((l: { id: string; topic_id: string }) => {
    lessonToSubject[l.id] = topicToSubject[l.topic_id];
  });
  const lessonIds = Object.keys(lessonToSubject);

  const result: Record<string, { total: number; completed: number }> = {};
  lessonIds.forEach((lid) => {
    const sid = lessonToSubject[lid];
    result[sid] = result[sid] ?? { total: 0, completed: 0 };
    result[sid].total += 1;
  });

  if (lessonIds.length > 0) {
    const { data: progress } = await supabase
      .from('progress')
      .select('lesson_id, completed')
      .eq('user_id', userId)
      .in('lesson_id', lessonIds);

    (progress ?? []).forEach((p: { lesson_id: string; completed: boolean }) => {
      if (!p.completed) return;
      const sid = lessonToSubject[p.lesson_id];
      if (sid) result[sid].completed += 1;
    });
  }

  return result;
}
