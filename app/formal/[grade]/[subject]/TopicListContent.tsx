'use client';

import { CardLink } from '@/components/Card';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useLocale } from '@/components/LocaleProvider';
import { ChevronRight } from 'lucide-react';
import type { Grade, Subject, Topic } from '@/lib/types';

export function TopicListContent({
  grade,
  subject,
  topics,
  lessonCounts,
}: {
  grade: Grade;
  subject: Subject;
  topics: Topic[];
  lessonCounts: Record<string, number>;
  loggedIn: boolean;
}) {
  const { t } = useLocale();

  return (
    <div className="pt-4">
      <Breadcrumb
        items={[
          { label: t('formalTrack'), href: '/formal' },
          { label: grade.name, href: `/formal/${grade.slug}` },
          { label: subject.name },
        ]}
      />
      <h1 className="mt-2 font-heading text-2xl font-bold text-textneutral">{subject.name}</h1>
      <p className="mt-1 text-sm text-gray-500">{grade.name} · {t('topicsInOrder')}</p>

      {topics.length === 0 ? (
        <p className="mt-8 text-sm text-gray-400">{t('noTopicsYet')}</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic, i) => (
            <CardLink key={topic.id} href={`/formal/${grade.slug}/${subject.slug}/${topic.slug}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-sm font-bold text-white shadow-card">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-sm font-semibold text-textneutral">{topic.name}</p>
                  {topic.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{topic.description}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    <span className="rounded-full bg-primary-50 px-2 py-0.5 font-semibold text-primary">{lessonCounts[topic.id] ?? 0} {t('lessons')}</span>
                  </p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-gray-300" />
              </div>
            </CardLink>
          ))}
        </div>
      )}
    </div>
  );
}
