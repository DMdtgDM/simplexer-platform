import { CalendarClock } from 'lucide-react';

/** Small banner showing days remaining until a grade's national exam date. Renders nothing if the date is missing or already past. */
export function ExamCountdownBanner({ examDate, tag }: { examDate: string | null; tag?: string | null }) {
  if (!examDate) return null;

  const dayMs = 24 * 60 * 60 * 1000;
  const today = Math.floor(Date.now() / dayMs);
  const target = Math.floor(new Date(`${examDate}T00:00:00`).getTime() / dayMs);
  const daysLeft = target - today;

  if (daysLeft < 0) return null;

  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-secondary/30 bg-secondary/10 px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-white">
        <CalendarClock size={18} />
      </span>
      <div className="min-w-0">
        <p className="font-heading text-sm font-bold text-textneutral">
          {daysLeft === 0 ? "Exam is today — good luck!" : `${daysLeft} day${daysLeft === 1 ? '' : 's'} until the national exam`}
        </p>
        <p className="text-xs text-gray-600">{tag ?? 'National Exam Prep'} — keep going.</p>
      </div>
    </div>
  );
}
