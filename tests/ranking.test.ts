import { describe, expect, it } from 'vitest';
import { compareAttempts, isSuspiciouslyFast, type RankableAttempt } from '@/lib/ranking';

const attempt = (patch: Partial<RankableAttempt>): RankableAttempt => ({
  score: 8, total: 10, duration_seconds: 600, submitted_at: '2026-10-15T00:00:00Z', ...patch,
});

describe('competition ranking rule (mirrors 0017 SQL)', () => {
  it('higher score wins first', () => {
    expect(compareAttempts(attempt({ score: 9 }), attempt({ score: 8 }))).toBeLessThan(0);
  });
  it('breaks score ties by seconds per question, not total time', () => {
    const moreQuestionsButFasterEach = attempt({ total: 20, duration_seconds: 1000 }); // 50s/q
    const fewerQuestionsSlowerEach = attempt({ total: 10, duration_seconds: 600 }); // 60s/q
    expect(compareAttempts(moreQuestionsButFasterEach, fewerQuestionsSlowerEach)).toBeLessThan(0);
  });
  it('breaks remaining ties by earliest submission', () => {
    const early = attempt({ submitted_at: '2026-10-15T00:00:00Z' });
    const late = attempt({ submitted_at: '2026-10-15T01:00:00Z' });
    expect(compareAttempts(early, late)).toBeLessThan(0);
  });
  it('flags attempts averaging under 4 seconds per question', () => {
    expect(isSuspiciouslyFast(attempt({ duration_seconds: 30 }))).toBe(true);
    expect(isSuspiciouslyFast(attempt({ duration_seconds: 300 }))).toBe(false);
    expect(isSuspiciouslyFast(attempt({ duration_seconds: null }))).toBe(false);
  });
});
