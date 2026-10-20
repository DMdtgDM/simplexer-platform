'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { authed, dbError, enc } from './shared';
import { randomUUID } from 'crypto';

const MSG: Record<string, string> = {
  wrong_code: 'That access code is not correct.',
  payment_ref_needed: 'Enter your payment reference so we can verify it.',
  closed: 'This competition is not open.',
  ended: 'This competition has ended.',
  no_entry: 'You need an approved entry first.',
  not_live: 'This competition is not live right now.',
  not_ended: 'The competition has not ended yet.',
  forbidden: 'You are not allowed to do that.',
  organiser: 'You organise this competition, so you cannot enter it.',
  finalized: 'This competition is already finalized.',
  too_many: 'Too many wrong codes. Wait 10 minutes and try again.',
  winner_already_paid: 'That winner was already paid, so they cannot be replaced or disqualified. If they truly must be removed, use "Remove paid winner" on their card — the removal stays on record with the payment details.',
  reason_required: 'Write a reason first — it goes on the permanent removal record.',
  not_a_winner: 'That student is not a winner in this competition.',
  not_paid: 'That winner has not been paid — use Replace winner or Disqualify instead.',
};
const fail = (path: string, e: { message?: string } | null): never =>
  redirect(`${path}?error=${enc(MSG[e?.message ?? ''] ?? 'Something went wrong. Please try again.')}`);


export async function createCompetition(formData: FormData) {
  const { supabase, user } = await authed();
  const f = (k: string) => String(formData.get(k) ?? '').trim();
  const access = ['open', 'code', 'approval'].includes(f('access')) ? f('access') : 'open';
  const start = new Date(`${f('starts_at')}:00+03:00`);
  const end = new Date(`${f('ends_at')}:00+03:00`);
  if (!f('title') || isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) redirect('/competitions?error=' + enc('Add a title and make the closing time later than the opening time.'));
  if (access === 'code' && !f('code')) redirect('/competitions?error=' + enc('Set an access code for a code-protected competition.'));

  const id = randomUUID(); // made here, so we never need to read the new row back
  const { error } = await supabase.from('competitions').insert({
    id, title: f('title'), description: f('description'), access,
    entry_fee: Math.max(0, Number(f('entry_fee')) || 0), payment_info: f('payment_info'),
    time_limit_min: Math.min(180, Math.max(1, Number(f('time_limit_min')) || 10)),
    prize_1: f('prize_1'), prize_2: f('prize_2'), prize_3: f('prize_3'),
    starts_at: start.toISOString(), ends_at: end.toISOString(), created_by: user.id, status: 'draft',
    course_id: f('course_id') || null,
  });
  if (error) redirect('/competitions?error=' + enc(dbError(error)));
  if (access === 'code') await supabase.from('competition_secrets').insert({ competition_id: id, access_code: f('code') });
  redirect(`/competitions/${id}/manage`);
}

/** One question per line:  Question? | wrong | *right | wrong | wrong   (the * marks the correct answer) */
export async function addQuestions(compId: string, formData: FormData) {
  const { supabase } = await authed();
  const path = `/competitions/${compId}/manage`;
  const { count } = await supabase.from('competition_questions').select('id', { count: 'exact', head: true }).eq('competition_id', compId);
  let pos = count ?? 0, bad = 0, added = 0;
  for (const line of String(formData.get('lines') ?? '').split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('|').map((p) => p.trim()).filter(Boolean);
    const opts = parts.slice(1);
    if (parts.length < 3 || opts.length > 6 || opts.filter((o) => o.startsWith('*')).length !== 1) { bad++; continue; }
    const { data: q } = await supabase.from('competition_questions').insert({ competition_id: compId, position: pos++, body: parts[0] }).select('id').single();
    if (!q) { bad++; continue; }
    await supabase.from('competition_options').insert(opts.map((o, i) => ({ question_id: q.id, position: i, body: o.replace(/^\*\s*/, ''), is_correct: o.startsWith('*') })));
    added++;
  }
  revalidatePath(path);
  redirect(`${path}?${bad ? 'error=' + enc(`${bad} line(s) skipped. Each line needs a question, 2 to 6 answers, and exactly one answer starting with *.`) : 'ok=' + enc(`${added} question(s) added.`)}`);
}

/** One question from the builder form: q + o1..o4 (+ optional o5/o6) + correct = 1-based index. */
export async function addOneQuestion(compId: string, formData: FormData) {
  const { supabase } = await authed();
  const path = `/competitions/${compId}/manage`;
  const body = String(formData.get('q') ?? '').trim();
  const opts = [1, 2, 3, 4, 5, 6].map((n) => String(formData.get(`o${n}`) ?? '').trim()).filter(Boolean);
  const correctIdx = Math.max(1, Number(formData.get('correct')) || 1) - 1;
  if (!body || opts.length < 2 || correctIdx >= opts.length) redirect(path + '?error=' + enc('Add a question and at least two answers, and pick the correct one.'));
  const { count } = await supabase.from('competition_questions').select('id', { count: 'exact', head: true }).eq('competition_id', compId);
  const { data: q, error } = await supabase.from('competition_questions').insert({ competition_id: compId, position: count ?? 0, body }).select('id').single();
  if (error || !q) redirect(path + '?error=' + enc(dbError(error ?? { message: 'no row' })));
  await supabase.from('competition_options').insert(opts.map((o, i) => ({ question_id: q.id, position: i, body: o, is_correct: i === correctIdx })));
  revalidatePath(path);
  redirect(path + '?ok=' + enc('Question added.'));
}

export async function deleteQuestion(compId: string, qid: string) {
  const { supabase } = await authed();
  await supabase.from('competition_questions').delete().eq('id', qid);
  revalidatePath(`/competitions/${compId}/manage`);
  redirect(`/competitions/${compId}/manage`);
}

export async function publishCompetition(compId: string) {
  const { supabase } = await authed();
  const { count } = await supabase.from('competition_questions').select('id', { count: 'exact', head: true }).eq('competition_id', compId);
  if ((count ?? 0) < 3) redirect(`/competitions/${compId}/manage?error=` + enc('Add at least 3 questions before publishing.'));
  await supabase.from('competitions').update({ status: 'published' }).eq('id', compId).eq('status', 'draft');
  revalidatePath('/competitions');
  redirect(`/competitions/${compId}/manage?ok=` + enc('Published. People can now join.'));
}

async function courseGate(supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>, compId: string) {
  const { data } = await supabase.rpc('competition_course_eligible', { comp: compId });
  return data === true;
}

export async function joinCompetition(compId: string, formData: FormData) {
  const { supabase } = await authed();
  if (!(await courseGate(supabase, compId))) {
    redirect(`/competitions/${compId}?error=` + enc('This competition belongs to a course. Finish more than half of the course first, then come back and join.'));
  }
  const { data, error } = await supabase.rpc('competition_join', {
    comp: compId, code: String(formData.get('code') ?? ''), pay_ref: String(formData.get('pay_ref') ?? ''),
  });
  if (error) fail(`/competitions/${compId}`, error);
  if (data === 'wrong_code' || data === 'too_many') fail(`/competitions/${compId}`, { message: data });
  revalidatePath(`/competitions/${compId}`);
  redirect(`/competitions/${compId}`);
}

export async function startAttempt(compId: string) {
  const { supabase } = await authed();
  if (!(await courseGate(supabase, compId))) {
    redirect(`/competitions/${compId}?error=` + enc('This competition belongs to a course. Finish more than half of the course first, then come back and play.'));
  }
  const { error } = await supabase.rpc('competition_start', { comp: compId });
  if (error) fail(`/competitions/${compId}`, error);
  redirect(`/competitions/${compId}/play`);
}

export async function submitAttempt(attemptId: string, compId: string, answers: Record<string, string>) {
  const { supabase } = await authed();
  await supabase.rpc('competition_submit', { att: attemptId, ans: answers });
  revalidatePath(`/competitions/${compId}`);
  redirect(`/competitions/${compId}?done=1`);
}

export async function setEntryStatus(compId: string, entryId: string, status: 'approved' | 'rejected') {
  const { supabase } = await authed();
  await supabase.from('competition_entries').update({ status }).eq('id', entryId);
  revalidatePath(`/competitions/${compId}/manage`);
  redirect(`/competitions/${compId}/manage`);
}

export async function finalizeCompetition(compId: string) {
  const { supabase } = await authed();
  const { error } = await supabase.rpc('competition_finalize', { comp: compId });
  if (error) fail(`/competitions/${compId}/manage`, error);
  revalidatePath(`/competitions/${compId}`);
  redirect(`/competitions/${compId}/manage?ok=` + enc('Winners recorded.'));
}

export async function markPrizePaid(compId: string, rank: number, formData: FormData) {
  const { supabase } = await authed();
  const ref = String(formData.get('payment_ref') ?? '').trim();
  await supabase.from('competition_winners').update({
    paid: true, paid_at: new Date().toISOString(), payment_ref: ref,
  }).eq('competition_id', compId).eq('rank', rank);
  revalidatePath(`/competitions/${compId}/manage`);
  redirect(`/competitions/${compId}/manage?ok=` + enc('Prize marked as paid.'));
}

export async function verifyWinner(compId: string, rank: number) {
  const { supabase } = await authed();
  // Manager confirms: this winner is a real, known student (account + phone checked).
  await supabase.from('competition_winners').update({ verified: true }).eq('competition_id', compId).eq('rank', rank);
  revalidatePath(`/competitions/${compId}/manage`);
  redirect(`/competitions/${compId}/manage?ok=` + enc('Winner verified.'));
}

export async function replaceWinner(compId: string, rank: number) {
  const { supabase } = await authed();
  // Prize moves to the next eligible student (score, then speed, then earliest).
  const { error } = await supabase.rpc('competition_replace_winner', { comp: compId, rnk: rank });
  if (error) fail(`/competitions/${compId}/manage`, error);
  revalidatePath(`/competitions/${compId}`);
  revalidatePath(`/competitions/${compId}/manage`);
  redirect(`/competitions/${compId}/manage?ok=` + enc('Winner replaced: the prize now belongs to the next student in the ranking.'));
}

export async function removePaidWinner(compId: string, userId: string, formData: FormData) {
  const { supabase } = await authed();
  // The escape hatch for "cheating found after payment": the database
  // demands a reason and keeps the removal + payment details on record.
  const { error } = await supabase.rpc('competition_remove_paid_winner', {
    comp: compId, uid: userId, why: String(formData.get('why') ?? ''),
  });
  if (error) fail(`/competitions/${compId}/manage`, error);
  revalidatePath(`/competitions/${compId}`);
  revalidatePath(`/competitions/${compId}/manage`);
  redirect(`/competitions/${compId}/manage?ok=` + enc('Paid winner removed. The removal and its payment details are saved in the removal log.'));
}

export async function saveWinnerPhone(compId: string, formData: FormData) {
  const { supabase } = await authed();
  await supabase.rpc('competition_save_phone', { comp: compId, ph: String(formData.get('phone') ?? '') });
  revalidatePath(`/competitions/${compId}`);
  redirect(`/competitions/${compId}?ok=` + enc('Thanks. We will contact you about your prize.'));
}

export async function deleteCompetition(id: string) {
  const { supabase } = await authed();
  const path = `/competitions/${id}/manage`;
  const { data, error } = await supabase.from('competitions').delete().eq('id', id).select('id');
  if (error) redirect(path + '?error=' + enc(dbError(error)));
  if (!data?.length) {
    redirect(path + '?error=' + enc('Nothing was deleted. Either this competition was already removed, or your account may not manage it. If it is finalized and still will not delete, run migration 0020 in Supabase.'));
  }
  revalidatePath('/competitions');
  redirect('/competitions?ok=' + enc('Competition deleted.'));
}

/** Called every time an answer is picked, so a lost connection never loses the attempt. */
export async function saveAnswer(attemptId: string, questionId: string, optionId: string) {
  const supabase = await createClient();
  await supabase.rpc('competition_save_answer', { att: attemptId, qid: questionId, oid: optionId });
}

export async function disqualifyEntry(compId: string, userId: string, formData: FormData) {
  const { supabase } = await authed();
  const { error } = await supabase.rpc('competition_disqualify', { comp: compId, uid: userId, why: String(formData.get('why') ?? '') });
  if (error) fail(`/competitions/${compId}/manage`, error);
  revalidatePath(`/competitions/${compId}`);
  redirect(`/competitions/${compId}/manage?ok=` + enc('Entry disqualified.'));
}

