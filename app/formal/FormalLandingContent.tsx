'use client';

import { ArrowRight } from 'lucide-react';
import { CardLink } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { useLocale } from '@/components/LocaleProvider';
import type { Grade } from '@/lib/types';

export function FormalLandingContent({ grades, subjectCounts }: { grades: Grade[]; subjectCounts: Record<string, number> }) {
  const { t } = useLocale();
  return (
    <div className="pt-4">
      <header className="rounded-3xl bg-gradient-to-br from-primary to-primary-light p-5 text-white shadow-lift sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-white/70">{t('formalTrack')}</p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold sm:text-3xl">{t('pickGrade')}</h1>
        <p className="mt-2 max-w-xl text-white/85">{t('pickGradeSub')}</p>
      </header>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {grades.length === 0 && <p className="text-sm text-gray-400">{t('noGradesYet')}</p>}
        {grades.map((grade) => {
          const count = subjectCounts[grade.id] ?? 0;
          const num = grade.name.match(/\d+/)?.[0];
          return (
            <CardLink key={grade.id} href={`/formal/${grade.slug}`} className="flex items-center gap-5">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-light font-heading text-2xl font-extrabold text-white shadow-card transition-transform group-hover:scale-105">{num ?? grade.name.slice(0, 2)}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-heading text-xl font-bold text-textneutral">{grade.name}</span>
                <span className="mt-1 block text-sm text-gray-500">{count} {t('subjects')}</span>
                {grade.tag && <span className="mt-2 inline-block"><Badge tone="secondary">{grade.tag}</Badge></span>}
              </span>
              <ArrowRight className="shrink-0 text-gray-300 transition group-hover:translate-x-1 group-hover:text-primary" />
            </CardLink>
          );
        })}
      </div>
    </div>
  );
}
