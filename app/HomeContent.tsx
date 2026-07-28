'use client';

import { CardLink } from '@/components/Card';
import { ButtonLink } from '@/components/Button';
import { useLocale } from '@/components/LocaleProvider';
import { Send, BookOpen, Video, ClipboardCheck, Clock } from 'lucide-react';
import type { Lesson } from '@/lib/types';

export function HomeContent({ lessons }: { lessons: Lesson[] }) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-10 pt-2">
      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-br from-primary to-primary-light px-6 py-10 text-white">
        <p className="font-heading text-sm font-semibold uppercase tracking-wide text-white/70">
          Simplexer
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold leading-tight sm:text-4xl">
          {t('tagline')}
        </h1>
        <p className="mt-3 max-w-lg text-sm text-white/85 sm:text-base">{t('heroSub')}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/formal" variant="secondary">
            {t('studyByGrade')}
          </ButtonLink>
          <ButtonLink href="/interests" className="bg-white/10 text-white hover:bg-white/20">
            {t('exploreInterests')}
          </ButtonLink>
        </div>
      </section>

      {/* Telegram banner */}
      <a
        href="https://t.me/simplexer101"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-4 rounded-2xl border border-secondary/30 bg-secondary/10 p-4 transition-colors hover:bg-secondary/15"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-white">
          <Send size={20} />
        </span>
        <span>
          <span className="block font-heading font-semibold text-textneutral">{t('joinTelegram')}</span>
          <span className="block text-xs text-gray-600">{t('joinTelegramSub')}</span>
        </span>
      </a>

      {/* Featured / recent lessons */}
      {lessons.length > 0 && (
        <section>
          <h2 className="mb-3 font-heading text-lg font-bold text-textneutral">{t('featured')}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {lessons.map((lesson) => (
              <CardLink key={lesson.id} href={`/lesson/${lesson.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading text-sm font-semibold text-textneutral">{lesson.title}</h3>
                  {lesson.video_url ? (
                    <Video size={16} className="mt-0.5 shrink-0 text-secondary" />
                  ) : (
                    <BookOpen size={16} className="mt-0.5 shrink-0 text-primary" />
                  )}
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={12} />
                  {lesson.est_minutes} {t('minRead')}
                </div>
              </CardLink>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section>
        <h2 className="mb-3 font-heading text-lg font-bold text-textneutral">{t('howItWorks')}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: BookOpen, label: t('step1') },
            { icon: Video, label: t('step2') },
            { icon: ClipboardCheck, label: t('step3') },
          ].map(({ icon: Icon, label }, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-card">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary">
                <Icon size={20} />
              </span>
              <p className="mt-3 text-sm font-medium text-textneutral">
                {i + 1}. {label}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
