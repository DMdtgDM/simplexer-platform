'use client';

import { ArrowRight } from 'lucide-react';
import { CardLink } from '@/components/Card';
import { useLocale } from '@/components/LocaleProvider';
import { iconFor } from '@/components/IconMap';
import type { Category } from '@/lib/types';

export function InterestsLandingContent({ categories, courseCounts }: { categories: Category[]; courseCounts: Record<string, number> }) {
  const { t } = useLocale();
  return (
    <div className="pt-4">
      <header className="rounded-3xl bg-gradient-to-br from-secondary to-secondary-light p-5 text-gray-900 shadow-lift sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-800/70">{t('interestTrack')}</p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold sm:text-3xl">{t('pickSkill')}</h1>
        <p className="mt-2 max-w-xl text-gray-800">{t('pickSkillSub')}</p>
      </header>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.length === 0 && <p className="text-sm text-gray-400">{t('noCategoriesYet')}</p>}
        {categories.map((category) => {
          const Icon = iconFor(category.icon);
          return (
            <CardLink key={category.id} href={`/interests/${category.slug}`} className="flex items-center gap-5 hover:!border-secondary/60">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-secondary/15 text-secondary-dark transition-transform group-hover:scale-110"><Icon size={30} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-heading text-lg font-bold text-textneutral">{category.name}</span>
                <span className="mt-1 block text-sm text-gray-500">{courseCounts[category.id] ?? 0} {t('courses')}</span>
              </span>
              <ArrowRight className="shrink-0 text-gray-300 transition group-hover:translate-x-1 group-hover:text-secondary-dark" />
            </CardLink>
          );
        })}
      </div>
    </div>
  );
}
