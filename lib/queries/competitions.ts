import { createClient } from '@/lib/supabase/server';
import type {
  Competition, LeaderboardRow, CompEntry, CompAttempt, CompWinner, PublicWinner, ManageQuestion, PlayQuestion, ManageAttempt, WinnerRemoval,
} from '@/lib/types';

export async function getCompetitions(): Promise<(Competition & { players: number })[]> {
  const supabase = await createClient();
  const [{ data }, { data: counts }] = await Promise.all([
    supabase.from('competitions').select('*').order('starts_at', { ascending: false }),
    supabase.rpc('competition_counts'),
  ]);
  const map = new Map<string, number>((counts ?? []).map((c: { competition_id: string; players: number }) => [c.competition_id, c.players]));
  const courseIds = [...new Set((data ?? []).map((c: Competition) => c.course_id).filter(Boolean))] as string[];
  const titles = new Map<string, string>();
  if (courseIds.length) {
    const { data: courses } = await supabase.from('courses').select('id, title').in('id', courseIds);
    (courses ?? []).forEach((c: { id: string; title: string }) => titles.set(c.id, c.title));
  }
  return (data ?? []).map((c: Competition) => ({ ...c, players: map.get(c.id) ?? 0, course_title: c.course_id ? titles.get(c.course_id) ?? null : null }));
}

export type CourseOption = { id: string; title: string };
export async function getCompetitionCourseOptions(): Promise<CourseOption[]> {
  const { data } = await (await createClient()).from('courses').select('id, title').eq('status', 'approved').order('title');
  return (data ?? []) as CourseOption[];
}

/** 0..1 of a course the user finished, or null when the competition has no course. */
export async function getCourseProgressFraction(userId: string, courseId: string): Promise<number> {
  const { data } = await (await createClient()).rpc('course_progress_fraction', { p_user: userId, p_course: courseId });
  return typeof data === 'number' ? data : 0;
}

export async function getCompetition(id: string): Promise<Competition | null> {
  const { data } = await (await createClient()).from('competitions').select('*').eq('id', id).maybeSingle();
  return data;
}

export async function getLeaderboard(id: string): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  await supabase.rpc('competition_settle', { comp: id }); // score anyone who ran out of time or lost connection
  const { data } = await supabase.rpc('competition_leaderboard', { comp: id });
  return (data as LeaderboardRow[] | null) ?? [];
}

export async function getPublicWinners(id: string): Promise<PublicWinner[]> {
  const { data } = await (await createClient()).rpc('competition_public_winners', { comp: id });
  return (data as PublicWinner[] | null) ?? [];
}

export async function getMyEntry(id: string, uid: string): Promise<Pick<CompEntry, 'status' | 'payment_ref'> | null> {
  const { data } = await (await createClient()).from('competition_entries').select('status, payment_ref').eq('competition_id', id).eq('user_id', uid).maybeSingle();
  return data;
}

export async function getMyAttempt(id: string, uid: string): Promise<CompAttempt | null> {
  const { data } = await (await createClient()).from('competition_attempts').select('id, submitted_at, score, total, duration_seconds').eq('competition_id', id).eq('user_id', uid).maybeSingle();
  return data;
}

export async function getMyWin(id: string, uid: string): Promise<CompWinner | null> {
  const { data } = await (await createClient()).from('competition_winners').select('*').eq('competition_id', id).eq('user_id', uid).maybeSingle();
  return data;
}

export async function getPlayQuestions(attemptId: string): Promise<PlayQuestion[]> {
  const { data } = await (await createClient()).rpc('competition_get_questions', { att: attemptId });
  return (data as PlayQuestion[] | null) ?? [];
}

export async function getSavedAnswers(attemptId: string): Promise<Record<string, string>> {
  const { data } = await (await createClient()).rpc('competition_my_answers', { att: attemptId });
  return Object.fromEntries(((data ?? []) as { question_id: string; option_id: string }[]).map((r) => [r.question_id, r.option_id]));
}

export async function getManageData(id: string) {
  const supabase = await createClient();
  await supabase.rpc('competition_settle', { comp: id });
  const [q, e, w, n, at, rm] = await Promise.all([
    supabase.from('competition_questions').select('id, body, position, competition_options(id, body, is_correct, position)').eq('competition_id', id).order('position'),
    supabase.from('competition_entries').select('*').eq('competition_id', id).order('created_at'),
    supabase.from('competition_winners').select('*').eq('competition_id', id).order('rank'),
    supabase.from('competition_secrets').select('access_code').eq('competition_id', id).maybeSingle(),
    supabase.from('competition_attempts').select('user_id, score, total, duration_seconds, submitted_at, disqualified, dq_reason').eq('competition_id', id).not('submitted_at', 'is', null).order('score', { ascending: false }),
    supabase.from('competition_winner_removals').select('id, user_name, rank, prize, phone, was_verified, was_paid, payment_ref, reason, removed_by_name, removed_at').eq('competition_id', id).order('removed_at', { ascending: false }),
  ]);
  return {
    questions: (q.data ?? []) as ManageQuestion[],
    entries: (e.data ?? []) as CompEntry[],
    winners: (w.data ?? []) as CompWinner[],
    code: (n.data?.access_code as string | undefined) ?? '',
    attempts: (at.data ?? []) as ManageAttempt[],
    removals: (rm.data ?? []) as WinnerRemoval[],
  };
}

export function competitionState(c: Pick<Competition, 'starts_at' | 'ends_at'>): 'upcoming' | 'live' | 'ended' {
  const now = Date.now();
  if (now < new Date(c.starts_at).getTime()) return 'upcoming';
  if (now > new Date(c.ends_at).getTime()) return 'ended';
  return 'live';
}

export function formatEat(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { timeZone: 'Africa/Addis_Ababa', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export const fmtDuration = (s: number | null) => (s == null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
export const prizeList = (c: Pick<Competition, 'prize_1' | 'prize_2' | 'prize_3'>) =>
  [c.prize_1, c.prize_2, c.prize_3].map((p, i) => ({ rank: i + 1, prize: p })).filter((p) => p.prize);
export const accessLabel = (c: Pick<Competition, 'access' | 'entry_fee'>, t: (k: 'accessFree' | 'accessCodeShort' | 'accessFeeEntry' | 'accessApproval') => string) =>
  c.access === 'open'
    ? t('accessFree')
    : c.access === 'code'
      ? t('accessCodeShort')
      : c.entry_fee > 0
        ? t('accessFeeEntry').replace('{fee}', String(c.entry_fee))
        : t('accessApproval');
