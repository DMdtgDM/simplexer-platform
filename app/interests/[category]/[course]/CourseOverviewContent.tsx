'use client';

import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Badge } from '@/components/Badge';
import { ButtonLink } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { useLocale } from '@/components/LocaleProvider';
import { CheckCircle2, Clock } from 'lucide-react';
import type { Category, Course, Lesson } from '@/lib/types';

const difficultyTone = { beginner: 'success', intermediate: 'secondary', advanced: 'error' } as const;

export function CourseOverviewContent({
  category,
  course,
  lessons,
  progressMap,
  loggedIn,
}: {
  category: Category;
  course: Course;
  lessons: Lesson[];
  progressMap: Record<string, boolean>;
  loggedIn: boolean;
}) {
  const { t } = useLocale();
  const completedCount = lessons.filter((l) => progressMap[l.id]).length;
  const pct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const started = loggedIn && completedCount > 0;
  const firstIncomplete = lessons.find((l) => !progressMap[l.id]) ?? lessons[0];

  return (
    <div className="pt-4">
      <Breadcrumb
        items={[
          { label: t('interestTrack'), href: '/interests' },
          { label: category.name, href: `/interests/${category.slug}` },
          { label: course.title },
        ]}
      />
      <h1 className="mt-2 font-heading text-2xl font-bold text-textneutral">{course.title}</h1>
      {course.description && <p className="mt-2 text-sm text-gray-600">{course.description}</p>}

      {course.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={course.cover_image_url}
          alt=""
          className="mt-4 h-40 w-full rounded-2xl object-cover"
        />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone={difficultyTone[course.difficulty]}>{course.difficulty === 'beginner' ? t('diffBeginner') : course.difficulty === 'intermediate' ? t('diffIntermediate') : t('diffAdvanced')}</Badge>
        {course.instructor && <span className="text-xs text-gray-500">{t('byInstructor').replace('{name}', course.instructor)}</span>}
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Clock size={12} />
          {lessons.reduce((s, l) => s + l.est_minutes, 0)} {t('minRead')} {t('totalSuffix')}
        </span>
      </div>

      {loggedIn && lessons.length > 0 && (
        <div className="mt-4">
          <ProgressBar percent={pct} />
          <p className="mt-1 text-xs text-gray-400">
            {t('lessonsComplete').replace('{done}', String(completedCount)).replace('{total}', String(lessons.length))}
          </p>
        </div>
      )}

      {firstIncomplete && (
        <ButtonLink href={`/lesson/${firstIncomplete.id}`} className="mt-5 inline-flex">
          {started ? t('continueCourse') : t('startCourse')}
        </ButtonLink>
      )}

      <h2 className="mb-3 mt-8 font-heading text-lg font-bold text-textneutral">{t('syllabus')}</h2>
      <div className="flex flex-col gap-2">
        {lessons.map((lesson, i) => {
          const completed = loggedIn && progressMap[lesson.id];
          return (
            <Link
              key={lesson.id}
              href={`/lesson/${lesson.id}`}
              className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-card hover:border-primary/30"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                  completed ? 'bg-success/10 text-success' : 'bg-secondary/10 text-secondary-dark'
                }`}
              >
                {completed ? <CheckCircle2 size={14} /> : i + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-textneutral">{lesson.title}</span>
              <span className="text-xs text-gray-400">
                {lesson.est_minutes} {t('minRead')}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
