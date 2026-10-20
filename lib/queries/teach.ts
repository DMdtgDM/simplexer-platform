import { createClient } from '@/lib/supabase/server';
import { createPublicClient } from '@/lib/supabase/public';
import type { Course } from '@/lib/types';
import type { LessonDraft } from '@/lib/teach-types';
import type { Font, Size } from '@/lib/reading';

export type Tree = { id: string; name: string; subjects: { id: string; name: string; topics: { id: string; name: string }[] }[] }[];

export async function getStructureTree(): Promise<Tree> {
  const db = createPublicClient();
  const [g, s, t] = await Promise.all([
    db.from('grades').select('id, name').order('order'),
    db.from('subjects').select('id, name, grade_id').order('order'),
    db.from('topics').select('id, name, subject_id').order('order'),
  ]);
  return (g.data ?? []).map((gr) => ({
    ...gr,
    subjects: (s.data ?? []).filter((x) => x.grade_id === gr.id).map((sb) => ({
      id: sb.id, name: sb.name, topics: (t.data ?? []).filter((x) => x.subject_id === sb.id).map((tp) => ({ id: tp.id, name: tp.name })),
    })),
  }));
}

type Row = {
  id: string; title: string; content: string; video_url: string | null; attachment_url: string | null; attachment_size_kb: number | null;
  est_minutes: number; font: Font; text_size: Size; visibility?: string | null;
};

async function withQuizzes(rows: Row[]): Promise<LessonDraft[]> {
  const supabase = await createClient();
  const { data: quizzes } = rows.length
    ? await supabase.from('quizzes')
        .select('lesson_id, questions(id, question_text, explanation, order, question_type, question_options(id, option_text, order), question_answers(correct_option_id, correct_text))')
        .in('lesson_id', rows.map((r) => r.id))
    : { data: [] };
  type Ans = { correct_option_id: string | null; correct_text: string | null };
  type Q = { lesson_id: string; questions: { id: string; question_text: string; explanation: string | null; order: number; question_type?: string; question_options: { id: string; option_text: string; order: number }[]; question_answers?: Ans | Ans[] | null }[] };
  const byLesson = new Map<string, Q>(((quizzes ?? []) as unknown as Q[]).map((q) => [q.lesson_id, q]));
  return rows.map((r) => {
    const q = byLesson.get(r.id);
    return {
      id: r.id, title: r.title, content: r.content, video_url: r.video_url ?? '', attachment_url: r.attachment_url ?? '',
      attachment_size_kb: r.attachment_size_kb, est_minutes: r.est_minutes, font: r.font ?? 'sans', text_size: r.text_size ?? 'md',
      visibility: r.visibility === 'enrolled' || r.visibility === 'private' ? r.visibility : 'public',
      quiz: q && q.questions.length
        ? {
            questions: [...q.questions].sort((a, b) => a.order - b.order).map((x) => ({
              text: x.question_text, explanation: x.explanation ?? '',
              type: (x.question_type as 'multiple_choice' | 'true_false' | 'short_answer') ?? 'multiple_choice',
              answer: (Array.isArray(x.question_answers) ? x.question_answers[0] : x.question_answers)?.correct_text ?? '',
              options: [...x.question_options].sort((a, b) => a.order - b.order).map((o) => ({
                text: o.option_text,
                correct: (Array.isArray(x.question_answers) ? x.question_answers[0] : x.question_answers)?.correct_option_id === o.id,
              })),
            })),
          }
        : null,
    };
  });
}

export async function getCourseForEdit(courseId: string): Promise<{ course: Course; lessons: LessonDraft[] } | null> {
  const supabase = await createClient();
  const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
  if (!course) return null;
  const { data: rows } = await supabase.from('lessons').select('*').eq('course_id', courseId).order('order');
  return { course, lessons: await withQuizzes((rows ?? []) as Row[]) };
}

export async function getTopicLessonsForEdit(topicId: string, uid: string): Promise<LessonDraft[]> {
  const { data } = await (await createClient()).from('lessons').select('*').eq('topic_id', topicId).eq('submitted_by', uid).order('order');
  return withQuizzes((data ?? []) as Row[]);
}

export type MySchoolLesson = {
  id: string; title: string; status: string; rejection_reason: string | null; topic_id: string;
  topics: { name: string; subjects: { name: string; grades: { name: string } | null } | null } | null;
};
export async function getMySchoolLessons(uid: string): Promise<MySchoolLesson[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('lessons')
    .select('id, title, status, rejection_reason, topic_id, topics(name, subjects(name, grades(name)))')
    .eq('submitted_by', uid)
    .not('topic_id', 'is', null)
    .order('created_at', { ascending: false });
  return (data ?? []) as unknown as MySchoolLesson[];
}

export async function getLessonCounts(courseIds: string[]): Promise<Record<string, number>> {
  if (!courseIds.length) return {};
  const { data } = await (await createClient()).from('lessons').select('course_id').in('course_id', courseIds);
  const out: Record<string, number> = {};
  (data ?? []).forEach((l: { course_id: string }) => (out[l.course_id] = (out[l.course_id] ?? 0) + 1));
  return out;
}
