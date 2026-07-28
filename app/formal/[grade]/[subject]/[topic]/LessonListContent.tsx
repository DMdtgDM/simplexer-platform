'use client';

import { CardLink } from '@/components/Card';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useLocale } from '@/components/LocaleProvider';
import { Video, FileText, ClipboardCheck, CheckCircle2, Clock } from 'lucide-react';
import type { Grade, Subject, Topic, Lesson } from '@/lib/types';

export function LessonListContent({
  grade,
  subject,
  topic,
  lessons,
  lessonsWithQuiz,
  progressMap,
  loggedIn,
}: {
  grade: Grade;
  subject: Subject;
  topic: Topic;
  lessons: Lesson[];
  lessonsWithQuiz: Set<string>;
  progressMap: Record<string, boolean>;
  loggedIn: boolean;
}) {
  const { t } = useLocale();

  return (
    <div className="pt-4">
      <Breadcrumb
        items={[
          { label: t('formalTrack'), href: '/formal' },
          { label: grade.name, href: `/formal/${grade.slug}` },
          { label: subject.name, href: `/formal/${grade.slug}/${subject.slug}` },
          { label: topic.name },
        ]}
      />
      <h1 className="mt-2 font-heading text-2xl font-bold text-textneutral">{topic.name}</h1>
      {topic.description && <p className="mt-1 text-sm text-gray-500">{topic.description}</p>}

      <div className="mt-6 flex flex-col gap-3">
        {lessons.map((lesson, i) => {
          const completed = loggedIn && progressMap[lesson.id];
          return (
            <CardLink key={lesson.id} href={`/lesson/${lesson.id}`}>
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    completed ? 'bg-success/10 text-success' : 'bg-primary-50 text-primary'
                  }`}
                >
                  {completed ? <CheckCircle2 size={16} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-sm font-semibold text-textneutral">{lesson.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {lesson.est_minutes} {t('minRead')}
                    </span>
                    {lesson.video_url && (
                      <span className="flex items-center gap-1">
                        <Video size={12} /> video
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <FileText size={12} /> notes
                    </span>
                    {lessonsWithQuiz.has(lesson.id) && (
                      <span className="flex items-center gap-1">
                        <ClipboardCheck size={12} /> quiz
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardLink>
          );
        })}
      </div>
    </div>
  );
}
