'use client';

import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Badge } from '@/components/Badge';
import { CheckCircle2 } from 'lucide-react';
import type { QuizAttempt } from '@/lib/types';

export function ProgressDetailContent({
  lessons,
  attempts,
}: {
  lessons: { lessonId: string; title: string; completedAt: string | null }[];
  attempts: (QuizAttempt & { quizTitle: string })[];
}) {
  return (
    <div className="pt-4 pb-10">
      <Breadcrumb items={[{ label: 'Profile', href: '/profile' }, { label: 'Progress' }]} />
      <h1 className="mt-2 font-heading text-2xl font-bold text-textneutral">My Progress</h1>

      <h2 className="mb-3 mt-6 font-heading text-lg font-bold text-textneutral">Completed Lessons</h2>
      {lessons.length === 0 ? (
        <p className="text-sm text-gray-400">No lessons completed yet — go finish one!</p>
      ) : (
        <div className="flex flex-col gap-2">
          {lessons.map((l) => (
            <Link
              key={l.lessonId}
              href={`/lesson/${l.lessonId}`}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-card hover:border-primary/30"
            >
              <CheckCircle2 size={16} className="shrink-0 text-success" />
              <span className="flex-1 text-sm font-medium text-textneutral">{l.title}</span>
              {l.completedAt && (
                <span className="text-xs text-gray-400">
                  {new Date(l.completedAt).toLocaleDateString()}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-8 font-heading text-lg font-bold text-textneutral">Quiz History</h2>
      {attempts.length === 0 ? (
        <p className="text-sm text-gray-400">No quizzes attempted yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {attempts.map((a) => {
            const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
            return (
              <Link
                key={a.id}
                href={`/quiz/${a.quiz_id}/results?attempt=${a.id}`}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-card hover:border-primary/30"
              >
                <span className="flex-1 text-sm font-medium text-textneutral">{a.quizTitle}</span>
                <Badge tone={pct >= 60 ? 'success' : 'error'}>
                  {a.score}/{a.total} ({pct}%)
                </Badge>
                <span className="hidden text-xs text-gray-400 sm:block">
                  {new Date(a.attempted_at).toLocaleDateString()}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
