'use client';

import { CardLink } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ExamCountdownBanner } from '@/components/ExamCountdownBanner';
import { useLocale } from '@/components/LocaleProvider';
import { iconFor } from '@/components/IconMap';
import type { Grade, Subject } from '@/lib/types';

export function SubjectListContent({
  grade,
  subjects,
  topicCounts,
  completion,
  loggedIn,
}: {
  grade: Grade;
  subjects: Subject[];
  topicCounts: Record<string, number>;
  completion: Record<string, { total: number; completed: number }>;
  loggedIn: boolean;
}) {
  const { t } = useLocale();

  return (
    <div className="pt-4">
      <Breadcrumb items={[{ label: t('formalTrack'), href: '/formal' }, { label: grade.name }]} />
      <h1 className="mt-2 font-heading text-2xl font-bold text-textneutral">{grade.name}</h1>
      <p className="mt-1 text-sm text-gray-500">Choose a subject to browse topics.</p>
      <ExamCountdownBanner examDate={grade.exam_date} tag={grade.tag} />

      {subjects.length === 0 ? (
        <p className="mt-8 text-sm text-gray-400">No subjects published for this grade yet — check back soon.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {subjects.map((subject) => {
            const Icon = iconFor(subject.icon);
            const stat = completion[subject.id];
            const pct = stat && stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;

            return (
              <CardLink key={subject.id} href={`/formal/${grade.slug}/${subject.slug}`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-sm font-semibold text-textneutral">{subject.name}</p>
                    <p className="text-xs text-gray-500">
                      {topicCounts[subject.id] ?? 0} {t('topics')}
                    </p>
                  </div>
                </div>
                {loggedIn && stat && stat.total > 0 && (
                  <div className="mt-3">
                    <ProgressBar percent={pct} />
                    <p className="mt-1 text-right text-[11px] text-gray-400">{pct}%</p>
                  </div>
                )}
              </CardLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
