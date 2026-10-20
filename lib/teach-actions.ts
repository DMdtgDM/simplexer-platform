'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/slugify';
import { getTopicLessonsForEdit } from '@/lib/queries/teach';
import type { CourseDraft, LessonDraft, QuizDraft, SaveResult } from '@/lib/teach-types';

type Db = Awaited<ReturnType<typeof createClient>>;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n) || lo));

async function who(supabase: Db) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  return p && (p.role === 'teacher' || p.role === 'admin') ? { id: user.id, admin: p.role === 'admin' } : null;
}

async function saveQuiz(supabase: Db, lessonId: string, title: string, quiz: QuizDraft) {
  const questions = quiz.questions.filter((q) =>
    q.text.trim() &&
    (q.type === 'short_answer' ? q.answer.trim().length > 0 : q.options.filter((o) => o.text.trim()).length >= 2));
  if (!questions.length) return;
  const { data: found } = await supabase.from('quizzes').select('id').eq('lesson_id', lessonId).maybeSingle();
  let quizId = found?.id as string | undefined;
  if (!quizId) {
    quizId = randomUUID();
    await supabase.from('quizzes').insert({ id: quizId, lesson_id: lessonId, title: `${title || 'Lesson'} quiz`, pass_threshold: 60 });
  } else {
    const { data: old } = await supabase.from('questions').select('id').eq('quiz_id', quizId);
    const oldIds = (old ?? []).map((q: { id: string }) => q.id);
    if (oldIds.length) {
      await supabase.from('question_options').delete().in('question_id', oldIds);
      await supabase.from('questions').delete().in('id', oldIds);
    }
  }
  for (const [i, q] of questions.entries()) {
    const qid = randomUUID();
    const type = q.type ?? 'multiple_choice';
    await supabase.from('questions').insert({
      id: qid, quiz_id: quizId, question_text: q.text.trim(), explanation: q.explanation.trim() || null, order: i + 1,
      question_type: type,
    });
    if (type === 'short_answer') {
      // The key lives in the locked question_answers table, never on the question row.
      await supabase.from('question_answers').insert({ question_id: qid, correct_option_id: null, correct_text: q.answer.trim() });
      continue;
    }
    const opts = type === 'true_false'
      ? [{ text: 'True', correct: q.options.find((o) => o.text.trim().toLowerCase() === 'true')?.correct ?? q.options[0]?.correct ?? true },
         { text: 'False', correct: !(q.options.find((o) => o.text.trim().toLowerCase() === 'true')?.correct ?? q.options[0]?.correct ?? true) }]
      : q.options.filter((o) => o.text.trim());
    const hasCorrect = opts.some((o) => o.correct);
    const optionRows = opts.map((o, j) => ({ id: randomUUID(), question_id: qid, option_text: o.text.trim(), order: j + 1 }));
    await supabase.from('question_options').insert(optionRows);
    const correctIdx = hasCorrect ? opts.findIndex((o) => o.correct) : 0;
    await supabase.from('question_answers').insert({ question_id: qid, correct_option_id: optionRows[correctIdx]?.id ?? null, correct_text: null });
  }
}

/** Updates lessons in place (so student progress and bookmarks survive), adds new ones, removes deleted ones. */
async function persistLessons(
  supabase: Db, userId: string, isAdmin: boolean,
  scope: { course_id: string } | { topic_id: string }, lessons: LessonDraft[]
): Promise<{ ids: string[]; warning: string }> {
  const school = 'topic_id' in scope;
  let q = supabase.from('lessons').select('id').match(scope);
  if (school) q = q.eq('submitted_by', userId);
  const { data: existing } = await q;
  const have = new Set((existing ?? []).map((l: { id: string }) => l.id));
  const keep = new Set(lessons.filter((l) => l.id && have.has(l.id)).map((l) => l.id as string));
  const remove = [...have].filter((id) => !keep.has(id));
  let warning = '';
  if (remove.length) {
    const { error } = await supabase.from('lessons').delete().in('id', remove);
    // Show the real database error, never a guessed reason: a silent or
    // wrong message is how the old delete button failure hid for so long.
    if (error) warning = ` Some removed lessons could not be deleted: ${error.message}`;
  }
  const ids: string[] = [];
  for (const [i, l] of lessons.entries()) {
    const known = !!l.id && have.has(l.id);
    const id = known ? (l.id as string) : randomUUID();
    const row = {
      title: l.title.trim(), content: l.content, video_url: l.video_url.trim() || null,
      attachment_url: l.attachment_url || null, attachment_size_kb: l.attachment_url ? l.attachment_size_kb : null,
      est_minutes: clamp(l.est_minutes, 1, 240), font: l.font, text_size: l.text_size, order: i + 1,
      visibility: l.visibility === 'enrolled' || l.visibility === 'private' ? l.visibility : 'public',
    };
    const extra = school ? { status: isAdmin ? 'approved' : 'pending' } : {};
    const { error } = known
      ? await supabase.from('lessons').update({ ...row, ...extra }).eq('id', id)
      : await supabase.from('lessons').insert({
          ...row, ...extra, id, ...scope, slug: `${slugify(l.title) || 'lesson'}-${id.slice(0, 6)}`, submitted_by: school ? userId : null,
        });
    if (error) throw new Error(`Lesson ${i + 1}: ${error.message}`);
    if (l.quiz) await saveQuiz(supabase, id, l.title, l.quiz);
    ids.push(id);
  }
  return { ids, warning };
}

const lessonProblem = (lessons: LessonDraft[]) => {
  const bad = lessons.findIndex((l) => !l.title.trim() || (!l.content.trim() && !l.video_url.trim()));
  return bad >= 0 ? `Lesson ${bad + 1} needs a title and some content or a video.` : '';
};

export async function saveSkillCourse(draft: CourseDraft, intent: 'draft' | 'submit'): Promise<SaveResult> {
  try {
    const supabase = await createClient();
    const me = await who(supabase);
    if (!me) return { ok: false, message: 'Only teachers and admins can build courses.' };
    if (draft.title.trim().length < 3) return { ok: false, message: 'Give the course a title.' };
    if (!draft.categoryId) return { ok: false, message: 'Pick a category.' };
    if (intent === 'submit') {
      if (!draft.lessons.length) return { ok: false, message: 'Add at least one lesson before submitting.' };
      const p = lessonProblem(draft.lessons);
      if (p) return { ok: false, message: p };
    }

    let existing: { id: string; status: string; submitted_by: string | null; slug: string } | null = null;
    if (draft.id) {
      const { data } = await supabase.from('courses').select('id, status, submitted_by, slug').eq('id', draft.id).maybeSingle();
      existing = data;
      if (!existing || (existing.submitted_by !== me.id && !me.admin)) return { ok: false, message: 'That course is not yours.' };
    }
    const id = existing?.id ?? randomUUID();
    const status = intent === 'submit' ? (me.admin ? 'approved' : 'pending') : existing ? existing.status : 'draft';
    const fields = {
      category_id: draft.categoryId, title: draft.title.trim(), description: draft.description.trim(), difficulty: draft.difficulty,
      language: draft.language, instructor: draft.instructor.trim() || null, cover_image_url: draft.coverImageUrl.trim() || null,
      status, rejection_reason: null,
    };
    const { error } = existing
      ? await supabase.from('courses').update(fields).eq('id', id)
      : await supabase.from('courses').insert({ ...fields, id, slug: `${slugify(draft.title) || 'course'}-${id.slice(0, 6)}`, submitted_by: me.id });
    if (error) return { ok: false, message: error.message };

    const { ids, warning } = await persistLessons(supabase, me.id, me.admin, { course_id: id }, draft.lessons);
    revalidatePath('/teach'); revalidatePath('/admin'); revalidatePath('/interests');
    const msg = intent === 'draft'
      ? existing && existing.status !== 'draft' ? 'Saved. Because it was already submitted, it goes back to review.' : 'Draft saved.'
      : me.admin ? 'Published.' : 'Submitted for review.';
    return { ok: true, message: msg + warning, id, lessonIds: ids };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Something went wrong.' };
  }
}

export async function saveSchoolLessons(topicId: string, lessons: LessonDraft[]): Promise<SaveResult> {
  try {
    const supabase = await createClient();
    const me = await who(supabase);
    if (!me) return { ok: false, message: 'Only teachers and admins can add lessons.' };
    if (!topicId) return { ok: false, message: 'Choose a grade, subject and topic first.' };
    const p = lessonProblem(lessons);
    if (p) return { ok: false, message: p };
    const { ids, warning } = await persistLessons(supabase, me.id, me.admin, { topic_id: topicId }, lessons);
    revalidatePath('/teach'); revalidatePath('/admin'); revalidatePath('/formal');
    return { ok: true, message: (me.admin ? 'Published.' : 'Saved and sent for review.') + warning, lessonIds: ids };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Something went wrong.' };
  }
}

/**
 * Item 10 (v13.5): a lesson's creator can delete their own lesson on its
 * own — not only create/edit. RLS is the enforcement (owner delete
 * policies from 0006: the lesson's submitted_by creator, the course
 * owner, admins); this action checks the deleted-row count so a denied
 * delete is reported honestly instead of silently doing nothing.
 * Attached quizzes, questions, options, answer keys, attempts, progress
 * and bookmarks all declare ON DELETE CASCADE, so the delete is clean
 * and total — the UI's confirmation says the quiz goes too.
 */
export async function deleteMyLesson(lessonId: string): Promise<{ ok: boolean; message: string }> {
  try {
    const supabase = await createClient();
    const me = await who(supabase);
    if (!me) return { ok: false, message: 'Only teachers and admins can delete lessons.' };
    const { data, error } = await supabase.from('lessons').delete().eq('id', lessonId).select('id');
    if (error) return { ok: false, message: error.message };
    if (!data || data.length === 0) {
      return { ok: false, message: 'That lesson could not be deleted. It is not yours, or it is already gone.' };
    }
    revalidatePath('/teach'); revalidatePath('/formal'); revalidatePath('/interests');
    return { ok: true, message: 'Lesson deleted.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Something went wrong.' };
  }
}

export async function loadTopicLessons(topicId: string): Promise<LessonDraft[]> {
  const supabase = await createClient();
  const me = await who(supabase);
  return me ? getTopicLessonsForEdit(topicId, me.id) : [];
}

/** Admins can add a missing topic while they build. */
export async function createTopic(subjectId: string, name: string): Promise<{ ok: boolean; id?: string; message: string }> {
  const supabase = await createClient();
  const me = await who(supabase);
  if (!me?.admin) return { ok: false, message: 'Ask an admin to add this topic.' };
  const clean = name.trim();
  if (clean.length < 2) return { ok: false, message: 'Type a topic name.' };
  const { count } = await supabase.from('topics').select('id', { count: 'exact', head: true }).eq('subject_id', subjectId);
  const id = randomUUID();
  const { error } = await supabase.from('topics').insert({ id, subject_id: subjectId, name: clean, slug: `${slugify(clean) || 'topic'}-${id.slice(0, 4)}`, order: (count ?? 0) + 1 });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/formal');
  return { ok: true, id, message: 'Topic added.' };
}
