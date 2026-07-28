'use client';

import { CardLink } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { useLocale } from '@/components/LocaleProvider';
import { GraduationCap } from 'lucide-react';
import type { Grade } from '@/lib/types';

export function FormalLandingContent({
  grades,
  subjectCounts,
}: {
  grades: Grade[];
  subjectCounts: Record<string, number>;
}) {
  const { t } = useLocale();

  return (
    <div className="pt-4">
      <h1 className="font-heading text-2xl font-bold text-textneutral">{t('formalTrack')}</h1>
      <p className="mt-1 text-sm text-gray-500">Pick your grade to browse subjects.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {grades.map((grade) => {
          const count = subjectCounts[grade.id] ?? 0;
          return (
            <CardLink key={grade.id} href={`/formal/${grade.slug}`} className="text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary">
                <GraduationCap size={20} />
              </span>
              <p className="mt-2 font-heading text-sm font-semibold text-textneutral">{grade.name}</p>
              <p className="mt-1 text-xs text-gray-500">
                {count} {t('subjects')}
              </p>
              {grade.tag && (
                <div className="mt-2 flex justify-center">
                  <Badge tone="secondary">{grade.tag}</Badge>
                </div>
              )}
            </CardLink>
          );
        })}
      </div>
    </div>
  );
}
