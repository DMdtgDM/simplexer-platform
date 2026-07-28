'use client';

import { CardLink } from '@/components/Card';
import { useLocale } from '@/components/LocaleProvider';
import { iconFor } from '@/components/IconMap';
import type { Category } from '@/lib/types';

export function InterestsLandingContent({
  categories,
  courseCounts,
}: {
  categories: Category[];
  courseCounts: Record<string, number>;
}) {
  const { t } = useLocale();

  return (
    <div className="pt-4">
      <h1 className="font-heading text-2xl font-bold text-textneutral">{t('interestTrack')}</h1>
      <p className="mt-1 text-sm text-gray-500">Learn a new skill at your own pace, no grade required.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {categories.map((category) => {
          const Icon = iconFor(category.icon);
          return (
            <CardLink
              key={category.id}
              href={`/interests/${category.slug}`}
              className="border-secondary/20 text-center hover:border-secondary/50"
            >
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-secondary/10 text-secondary-dark">
                <Icon size={20} />
              </span>
              <p className="mt-2 font-heading text-sm font-semibold text-textneutral">{category.name}</p>
              <p className="mt-1 text-xs text-gray-500">
                {courseCounts[category.id] ?? 0} {t('courses')}
              </p>
            </CardLink>
          );
        })}
      </div>
    </div>
  );
}
