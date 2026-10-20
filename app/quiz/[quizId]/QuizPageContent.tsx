'use client';

import { useState } from 'react';
import Link from 'next/link';
import { QuizOption } from '@/components/QuizOption';
import { field } from '@/components/Ui';
import { ButtonLink } from '@/components/Button';
import { useLocale } from '@/components/LocaleProvider';
import type { Question, Quiz } from '@/lib/types';

export function QuizPageContent({
  quiz,
  questions,
  loggedIn,
  backHref,
  action,
}: {
  quiz: Quiz;
  questions: Question[];
  loggedIn: boolean;
  backHref: string;
  action: (formData: FormData) => void;
}) {
  const { t } = useLocale();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="pt-4 pb-24">
      <Link href={backHref} className="text-xs text-gray-500 hover:text-primary">
        &larr; {t('backToLesson')}
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-bold text-textneutral">{quiz.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {t('questionsAnsweredCount').replace('{total}', String(questions.length)).replace('{answered}', String(answeredCount))}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-all duration-500"
          style={{ width: `${questions.length ? Math.round((answeredCount / questions.length) * 100) : 0}%` }}
        />
      </div>

      {!loggedIn && (
        <div className="mt-4 rounded-xl border border-secondary/30 bg-secondary/10 p-3 text-sm text-textneutral">
          {t('signUpToTrack')}{' '}
          <Link href="/signup" className="font-semibold text-primary underline">
            {t('signup')}
          </Link>
        </div>
      )}

      <form action={action} className="mt-6 flex flex-col gap-6">
        {questions.map((q, i) => (
          <fieldset key={q.id} className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-card dark:border-gray-800 dark:bg-gray-900">
            <legend className="mb-4 w-full px-0 text-[15px] font-semibold leading-snug text-textneutral">
              <span className="inline-flex items-center gap-2.5 align-middle">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{i + 1}</span>
                <span>{q.question_text}</span>
              </span>
            </legend>
            <div className="flex flex-col gap-2">
              {q.question_type === 'short_answer' ? (
                <input
                  name={`q_${q.id}`}
                  placeholder={t('typeYourAnswer')}
                  autoComplete="off"
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  className={field}
                />
              ) : q.question_options.map((opt, oi) => (
                <QuizOption
                  key={opt.id}
                  index={oi}
                  name={`q_${q.id}`}
                  value={opt.id}
                  label={opt.option_text}
                  checked={answers[q.id] === opt.id}
                  onChange={(val) => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
                />
              ))}
            </div>
          </fieldset>
        ))}

        <div className="sticky bottom-16 left-0 right-0 sm:bottom-4">
          {loggedIn ? (
            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-5 py-3.5 text-center text-sm font-semibold text-white shadow-lift transition hover:opacity-95 active:scale-[0.99]"
            >
              {t('submitQuiz')} ({answeredCount}/{questions.length})
            </button>
          ) : (
            <ButtonLink href="/signup" className="w-full">
              {t('signup')} {t('submitQuiz')}
            </ButtonLink>
          )}
        </div>
      </form>
    </div>
  );
}
