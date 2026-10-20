export type RankableAttempt = {
  score: number;
  total: number;
  duration_seconds: number | null;
  submitted_at: string | null;
};

/** The competition ranking rule, mirrored by the SQL in 0012/0017:
 * score first, then seconds per question, then earliest submission. */
export function compareAttempts(a: RankableAttempt, b: RankableAttempt): number {
  if (b.score !== a.score) return b.score - a.score;
  const aRate = (a.duration_seconds ?? Number.MAX_SAFE_INTEGER) / Math.max(a.total, 1);
  const bRate = (b.duration_seconds ?? Number.MAX_SAFE_INTEGER) / Math.max(b.total, 1);
  if (aRate !== bRate) return aRate - bRate;
  return String(a.submitted_at ?? '').localeCompare(String(b.submitted_at ?? ''));
}

export function isSuspiciouslyFast(attempt: RankableAttempt): boolean {
  return attempt.total > 0 && attempt.duration_seconds != null && attempt.duration_seconds / attempt.total < 4;
}
