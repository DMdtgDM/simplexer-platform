'use client';

import { CardLink } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useLocale } from '@/components/LocaleProvider';
import { Clock } from 'lucide-react';
import type { Category, Course } from '@/lib/types';

const difficultyTone = { beginner: 'success', intermediate: 'secondary', advanced: 'error' } as const;

export function CourseListContent({
  category,
  courses,
  lessonCounts,
  estMinutes,
}: {
  category: Category;
  courses: Course[];
  lessonCounts: Record<string, number>;
  estMinutes: Record<string, number>;
}) {
  const { t } = useLocale();

  return (
    <div className="pt-4">
      <Breadcrumb items={[{ label: t('interestTrack'), href: '/interests' }, { label: category.name }]} />
      <h1 className="mt-2 font-heading text-2xl font-bold text-textneutral">{category.name}</h1>

      {courses.length === 0 ? (
        <p className="mt-8 text-sm text-gray-400">{t('noCoursesInCategory')}</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CardLink key={course.id} href={`/interests/${category.slug}/${course.slug}`} className="overflow-hidden !p-0">
              {course.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={course.cover_image_url}
                  alt=""
                  className="h-28 w-full object-cover"
                />
              )}
              <div className="p-4">
                <p className="font-heading text-sm font-semibold text-textneutral">{course.title}</p>
                {course.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500">{course.description}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge tone={difficultyTone[course.difficulty]}>{course.difficulty === 'beginner' ? t('diffBeginner') : course.difficulty === 'intermediate' ? t('diffIntermediate') : t('diffAdvanced')}</Badge>
                  <span className="text-xs text-gray-400">
                    {lessonCounts[course.id] ?? 0} {t('lessons')}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={12} />
                    {estMinutes[course.id] ?? 0} {t('minRead')}
                  </span>
                </div>
              </div>
            </CardLink>
          ))}
        </div>
      )}
    </div>
  );
}
