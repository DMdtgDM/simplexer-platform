'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, Clock, GraduationCap, Rocket, Send, Sparkles, Trophy, UserCheck, Video } from 'lucide-react';
import { CardLink } from '@/components/Card';
import { ButtonLink } from '@/components/Button';
import { useLocale } from '@/components/LocaleProvider';
import type { Lesson } from '@/lib/types';

type Stats = { lessons: number; courses: number; grades: number; subjects: number };

export function HomeContent({ lessons, stats }: { lessons: Lesson[]; stats: Stats }) {
  const { t } = useLocale();
  const pillars = [
    { href: '/formal', icon: GraduationCap, title: t('formalTrack'), text: t('pillarFormalDesc'), tone: 'bg-primary text-white' },
    { href: '/interests', icon: Rocket, title: t('interestTrack'), text: t('pillarSkillsDesc'), tone: 'bg-secondary text-gray-900' },
    { href: '/tutors', icon: UserCheck, title: t('tutors'), text: t('pillarTutorsDesc'), tone: 'bg-emerald-600 text-white' },
    { href: '/competitions', icon: Trophy, title: t('compete'), text: t('pillarCompeteDesc'), tone: 'bg-rose-600 text-white' },
  ];
  const nums = [
    { n: stats.lessons, label: t('statLessons') }, { n: stats.courses, label: t('statCourses') },
    { n: stats.subjects, label: t('statSubjects') }, { n: stats.grades, label: t('statGrades') },
  ].filter((x) => x.n > 0);

  return (
    <div className="flex flex-col gap-10 pt-2">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary to-primary-light px-6 py-8 text-white shadow-lift sm:px-10 sm:py-10">
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom_right,black,transparent_70%)]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-secondary/30 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="animate-fadeUp">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold backdrop-blur"><Sparkles size={14} /> {t('heroBadge')}</span>
            <h1 className="mt-5 font-heading text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl">{t('tagline')}</h1>
            <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">{t('heroSub')}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/formal" variant="secondary">{t('studyByGrade')} <ArrowRight size={16} /></ButtonLink>
              <ButtonLink href="/interests" className="border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20">{t('exploreInterests')}</ButtonLink>
            </div>
          </div>

          {/* A taste of the product: decorative preview cards */}
          <div className="relative hidden h-60 lg:block" aria-hidden>
            <span className="absolute -top-3 right-2 z-10 rounded-full bg-gray-900/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{t('exampleChip')}</span>
            <div className="absolute left-2 top-0 w-64 animate-floaty rounded-2xl bg-white p-4 text-textneutral shadow-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{t('exampleSubjectLine')}</p>
              <p className="mt-1 font-heading font-bold">{t('exampleLessonTitle')}</p>
              <div className="mt-3 h-2 rounded-full bg-gray-100"><div className="h-2 w-2/3 rounded-full bg-primary" /></div>
              <p className="mt-2 flex items-center gap-1 text-xs text-gray-500"><Clock size={12} /> {t('exampleMinLesson')}</p>
            </div>
            <div className="absolute right-0 top-20 w-60 rotate-3 rounded-2xl bg-white p-4 text-textneutral shadow-2xl">
              <p className="flex items-center gap-2 text-sm font-bold text-green-600"><CheckCircle2 size={18} /> {t('quizPassedLabel')}</p>
              <p className="mt-1 text-3xl font-extrabold">9<span className="text-base font-semibold text-gray-400"> / 10</span></p>
              <p className="text-xs text-gray-500">{t('exampleStreak')}</p>
            </div>
            <div className="absolute bottom-0 left-10 w-56 -rotate-2 rounded-2xl bg-secondary p-4 text-gray-900 shadow-2xl">
              <p className="flex items-center gap-2 text-sm font-bold"><Trophy size={16} /> {t('weeklyCompetition')}</p>
              <p className="mt-1 text-xs">{t('topScoreWins')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Real numbers */}
      {nums.length > 0 && (
        <section className="-mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {nums.map((x) => (
            <div key={x.label} className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-card dark:border-gray-800 dark:bg-gray-900">
              <p className="font-heading text-2xl font-extrabold text-primary">{x.n}</p>
              <p className="text-xs font-medium text-gray-500">{x.label}</p>
            </div>
          ))}
        </section>
      )}

      {/* Four ways in */}
      <section>
        <h2 className="mb-5 font-heading text-2xl font-extrabold text-textneutral">{t('pillarsTitle')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <CardLink key={p.href} href={p.href} className="flex flex-col">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${p.tone} shadow-card transition-transform group-hover:scale-110`}><p.icon size={22} /></span>
              <p className="mt-4 font-heading text-lg font-bold text-textneutral">{p.title}</p>
              <p className="mt-1 flex-1 text-sm text-gray-500">{p.text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">{t('openLabel')} <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
            </CardLink>
          ))}
        </div>
      </section>

      {/* Recent lessons */}
      {lessons.length > 0 && (
        <section>
          <div className="mb-5 flex items-end justify-between"><h2 className="font-heading text-2xl font-extrabold text-textneutral">{t('featured')}</h2><Link href="/search" className="text-sm font-semibold text-primary">{t('searchAllLessons')}</Link></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {lessons.map((lesson) => (
              <CardLink key={lesson.id} href={`/lesson/${lesson.id}`} className="flex items-start gap-4">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${lesson.video_url ? 'bg-secondary/15 text-secondary-dark' : 'bg-primary-50 text-primary'}`}>{lesson.video_url ? <Video size={22} /> : <BookOpen size={22} />}</span>
                <span className="min-w-0">
                  <span className="block font-heading font-bold text-textneutral">{lesson.title}</span>
                  <span className="mt-1 flex items-center gap-1 text-xs text-gray-500"><Clock size={12} /> {lesson.est_minutes} {t('minRead')}</span>
                </span>
              </CardLink>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section>
        <h2 className="mb-5 font-heading text-2xl font-extrabold text-textneutral">{t('howItWorks')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[t('step1'), t('step2'), t('step3')].map((label, i) => (
            <div key={i} className="relative rounded-2xl border border-gray-100 bg-white p-5 shadow-card dark:border-gray-800 dark:bg-gray-900">
              <span className="absolute -top-4 left-6 grid h-9 w-9 place-items-center rounded-full bg-primary font-heading text-lg font-extrabold text-white shadow-lift">{i + 1}</span>
              <p className="mt-3 font-medium text-textneutral">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Teach with us */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-secondary to-secondary-light p-6 text-gray-900 sm:p-8">
        <div className="relative max-w-2xl">
          <h2 className="font-heading text-2xl font-extrabold">{t('teachBandTitle')}</h2>
          <p className="mt-2 text-gray-800">{t('teachBandSub')}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/teach" className="!bg-primary !text-white">{t('startTeaching')}</ButtonLink>
            <ButtonLink href="/tutor" className="border border-gray-900/30 bg-white/40 text-gray-900 hover:bg-white/60">{t('becomeTutor')}</ButtonLink>
          </div>
        </div>
      </section>

      <a href="https://t.me/simplexer101" target="_blank" rel="noreferrer" className="group flex items-center gap-4 rounded-2xl border border-secondary/30 bg-secondary/10 p-5 transition hover:bg-secondary/20">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-secondary text-white"><Send size={22} /></span>
        <span><span className="block font-heading text-lg font-bold text-textneutral">{t('joinTelegram')}</span><span className="block text-sm text-gray-600">{t('joinTelegramSub')}</span></span>
        <ArrowRight className="ml-auto text-gray-400 transition-transform group-hover:translate-x-1" />
      </a>
    </div>
  );
}
