'use client';

import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Bookmark, Clock } from 'lucide-react';

export function BookmarksContent({
  lessons,
}: {
  lessons: { lessonId: string; title: string; estMinutes: number; savedAt: string }[];
}) {
  return (
    <div className="pt-4 pb-10">
      <Breadcrumb items={[{ label: 'Profile', href: '/profile' }, { label: 'Saved Lessons' }]} />
      <h1 className="mt-2 font-heading text-2xl font-bold text-textneutral">Saved Lessons</h1>

      {lessons.length === 0 ? (
        <p className="mt-8 text-sm text-gray-400">
          Nothing saved yet — tap the bookmark icon on any lesson to add it here.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {lessons.map((l) => (
            <Link
              key={l.lessonId}
              href={`/lesson/${l.lessonId}`}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-card hover:border-primary/30"
            >
              <Bookmark size={16} className="shrink-0 text-secondary-dark" />
              <span className="flex-1 text-sm font-medium text-textneutral">{l.title}</span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={12} />
                {l.estMinutes} min
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
