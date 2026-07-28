'use client';

import { useState } from 'react';
import Link from 'next/link';
import { QuizOption } from '@/components/QuizOption';
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
        {questions.length} questions · {answeredCount}/{questions.length} answered
      </p>

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
          <fieldset key={q.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
            <legend className="mb-3 px-1 text-sm font-semibold text-textneutral">
              {i + 1}. {q.question_text}
            </legend>
            <div className="flex flex-col gap-2">
              {q.question_options.map((opt) => (
                <QuizOption
                  key={opt.id}
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
              className="w-full rounded-xl bg-primary px-5 py-3.5 text-center text-sm font-semibold text-white shadow-lg hover:bg-primary-dark"
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
