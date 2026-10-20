'use client';

import { QuizOptionResult } from '@/components/QuizOption';
import { ButtonLink } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { useLocale } from '@/components/LocaleProvider';
import type { Question, Quiz, QuizAttempt } from '@/lib/types';

export function ResultsContent({
  quiz,
  attempt,
  questions,
  lessonHref,
}: {
  quiz: Quiz;
  attempt: QuizAttempt;
  questions: Question[];
  lessonHref: string;
}) {
  const { t } = useLocale();
  const pct = attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0;
  const passed = pct >= quiz.pass_threshold;

  return (
    <div className="pt-4 pb-10">
      <h1 className="font-heading text-2xl font-bold text-textneutral">{quiz.title}</h1>

      <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-card">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{t('yourScore')}</p>
        <p className="font-heading text-3xl font-bold text-primary">
          {attempt.score}/{attempt.total}
        </p>
        <p className="text-sm text-gray-500">{pct}%</p>
        <Badge tone={passed ? 'success' : 'error'}>{passed ? 'Passed' : 'Below pass threshold'}</Badge>
      </div>

      <div className="mt-6 flex gap-3">
        <ButtonLink href={`/quiz/${quiz.id}`} variant="outline" className="flex-1">
          {t('retakeQuiz')}
        </ButtonLink>
        <ButtonLink href={lessonHref} className="flex-1">
          {t('backToLesson')}
        </ButtonLink>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {questions.map((q, i) => {
          const selected = attempt.answers?.[q.id];
          return (
            <div key={q.id} className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-card dark:border-gray-800 dark:bg-gray-900">
              <p className="mb-4 flex items-center gap-2.5 text-[15px] font-semibold leading-snug text-textneutral">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{i + 1}</span>
                <span>{q.question_text}</span>
              </p>
              <div className="flex flex-col gap-2">
                {q.question_type === 'short_answer' ? (
                  <div className="text-sm">
                    <p className="text-gray-500">Your answer: <span className="font-medium text-textneutral">{selected || '—'}</span></p>
                    <p className="mt-1 text-gray-500">Correct answer: <span className="font-medium text-green-700">{(q.correct_text ?? '').split('|')[0]}</span></p>
                  </div>
                ) : q.question_options.map((opt, oi) => (
                  <QuizOptionResult
                    key={opt.id}
                    index={oi}
                    label={opt.option_text}
                    isCorrect={opt.is_correct}
                    isSelected={selected === opt.id}
                  />
                ))}
              </div>
              {q.explanation && (
                <p className="mt-3 rounded-lg bg-primary-50 p-3 text-xs text-textneutral">{q.explanation}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
