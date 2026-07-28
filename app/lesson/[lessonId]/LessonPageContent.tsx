'use client';

import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button, ButtonLink } from '@/components/Button';
import { LessonContentRenderer } from '@/components/LessonContentRenderer';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { BookmarkButton } from '@/components/BookmarkButton';
import { useLocale } from '@/components/LocaleProvider';
import { markLessonComplete } from '@/lib/actions';
import { FileText, ChevronLeft, ChevronRight, CheckCircle2, Send, ArrowRight } from 'lucide-react';
import { useTransition } from 'react';
import type { Lesson } from '@/lib/types';
import type { LessonBreadcrumb, NextTopicSuggestion } from '@/lib/queries/lessons';

export function LessonPageContent({
  lesson,
  breadcrumb,
  quiz,
  adjacent,
  nextTopic,
  loggedIn,
  completed,
  bookmarked,
}: {
  lesson: Lesson;
  breadcrumb: LessonBreadcrumb | null;
  quiz: { id: string; title: string } | null;
  adjacent: { prev: Lesson | null; next: Lesson | null };
  nextTopic: NextTopicSuggestion | null;
  loggedIn: boolean;
  completed: boolean;
  bookmarked: boolean;
}) {
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();

  const crumbs = breadcrumb
    ? breadcrumb.track === 'formal'
      ? [
          { label: t('formalTrack'), href: '/formal' },
          { label: breadcrumb.grade.name, href: `/formal/${breadcrumb.grade.slug}` },
          {
            label: breadcrumb.subject.name,
            href: `/formal/${breadcrumb.grade.slug}/${breadcrumb.subject.slug}`,
          },
          {
            label: breadcrumb.topic.name,
            href: `/formal/${breadcrumb.grade.slug}/${breadcrumb.subject.slug}/${breadcrumb.topic.slug}`,
          },
          { label: lesson.title },
        ]
      : [
          { label: t('interestTrack'), href: '/interests' },
          { label: breadcrumb.category.name, href: `/interests/${breadcrumb.category.slug}` },
          {
            label: breadcrumb.course.title,
            href: `/interests/${breadcrumb.category.slug}/${breadcrumb.course.slug}`,
          },
          { label: lesson.title },
        ]
    : [{ label: lesson.title }];

  return (
    <div className="pt-4">
      <Breadcrumb items={crumbs} />
      <div className="mt-2 flex items-start justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold leading-tight text-textneutral">{lesson.title}</h1>
        {loggedIn && <BookmarkButton lessonId={lesson.id} initiallyBookmarked={bookmarked} />}
      </div>

      {lesson.video_url && (
        <div className="mt-5">
          <YouTubeEmbed url={lesson.video_url} title={lesson.title} />
        </div>
      )}

      <div className="mt-6">
        <LessonContentRenderer content={lesson.content} />
      </div>

      {lesson.attachment_url && (
        <a
          href={lesson.attachment_url}
          target="_blank"
          rel="noreferrer"
          className="mt-6 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-sm hover:border-primary/40"
        >
          <FileText size={18} className="text-primary" />
          <span className="flex-1">Download notes (PDF)</span>
          {lesson.attachment_size_kb && (
            <span className="text-xs text-gray-400">
              {lesson.attachment_size_kb < 1024
                ? `${lesson.attachment_size_kb} KB`
                : `${(lesson.attachment_size_kb / 1024).toFixed(1)} MB`}
            </span>
          )}
        </a>
      )}

      <a
        href="https://t.me/simplexer101"
        target="_blank"
        rel="noreferrer"
        className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-gray-200 p-3 text-sm text-gray-500 hover:border-secondary/40 hover:text-secondary-dark"
      >
        <Send size={16} className="shrink-0" />
        <span>Confused about this lesson? Ask on our Telegram channel.</span>
      </a>

      {/* Progress / quiz actions */}
      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
        {!loggedIn ? (
          <p className="text-sm text-gray-500">{t('signUpToTrack')}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {completed ? (
              <span className="flex items-center gap-1.5 text-sm font-medium text-success">
                <CheckCircle2 size={18} />
                {t('completed')}
              </span>
            ) : (
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await markLessonComplete(lesson.id);
                  })
                }
              >
                {t('markComplete')}
              </Button>
            )}
            {quiz && <ButtonLink href={`/quiz/${quiz.id}`}>{t('takeQuiz')}</ButtonLink>}
          </div>
        )}
        {!loggedIn && quiz && (
          <ButtonLink href="/signup" variant="secondary" className="self-start">
            {t('signup')}
          </ButtonLink>
        )}
      </div>

      {/* Prev/next navigation */}
      <div className="mt-6 flex items-center justify-between gap-3">
        {adjacent.prev ? (
          <Link
            href={`/lesson/${adjacent.prev.id}`}
            className="flex min-h-[44px] flex-1 items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-textneutral hover:border-primary/40"
          >
            <ChevronLeft size={16} />
            <span className="line-clamp-1">{t('previous')}</span>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {adjacent.next ? (
          <Link
            href={`/lesson/${adjacent.next.id}`}
            className="flex min-h-[44px] flex-1 items-center justify-end gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-textneutral hover:border-primary/40"
          >
            <span className="line-clamp-1">{t('next')}</span>
            <ChevronRight size={16} />
          </Link>
        ) : (
          <span className="flex-1" />
        )}
      </div>

      {/* Cross-topic "what's next" suggestion, shown when this is the last lesson in its topic */}
      {nextTopic && (
        <Link
          href={`/formal/${nextTopic.gradeSlug}/${nextTopic.subjectSlug}/${nextTopic.topicSlug}`}
          className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary-50 p-4 hover:border-primary/40"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-primary/70">Since you finished this topic, try</p>
            <p className="font-heading text-sm font-bold text-textneutral">{nextTopic.topicName}</p>
          </div>
          <ArrowRight size={18} className="shrink-0 text-primary" />
        </Link>
      )}
    </div>
  );
}
