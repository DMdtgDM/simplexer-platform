import { createClient } from '@/lib/supabase/server';

export type StreakInfo = {
  current: number;
  longest: number;
  activeToday: boolean;
};

/**
 * Computes the current and longest daily-study streak from `daily_activity`.
 * A streak is "current" if it includes today or yesterday (so it doesn't
 * reset to 0 the moment midnight passes — it resets only after a full day
 * is missed).
 */
export async function getStreakForUser(userId: string): Promise<StreakInfo> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('daily_activity')
    .select('activity_date')
    .eq('user_id', userId)
    .order('activity_date', { ascending: false })
    .limit(400);

  const dates = (data ?? []).map((row: { activity_date: string }) => row.activity_date);
  if (dates.length === 0) return { current: 0, longest: 0, activeToday: false };

  const dayMs = 24 * 60 * 60 * 1000;
  const toDay = (d: string) => Math.floor(new Date(`${d}T00:00:00Z`).getTime() / dayMs);
  const days = [...new Set(dates.map(toDay))].sort((a, b) => b - a);

  const todayNum = Math.floor(Date.now() / dayMs);
  const activeToday = days[0] === todayNum;

  // Current streak: walk back from today (or yesterday, if nothing logged
  // today yet) while consecutive days are present.
  let current = 0;
  let cursor = activeToday ? todayNum : todayNum - 1;
  const daySet = new Set(days);
  if (daySet.has(cursor)) {
    while (daySet.has(cursor)) {
      current += 1;
      cursor -= 1;
    }
  }

  // Longest streak ever, scanning the sorted unique days.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i - 1] - days[i] === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }
  longest = Math.max(longest, current);

  return { current, longest, activeToday };
}
