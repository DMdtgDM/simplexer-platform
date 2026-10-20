'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  submitAttempt, saveAnswer,
} from '@/lib/actions/competitions';
import { useLocale } from '@/components/LocaleProvider';

type Q = { id: string; body: string; options: { id: string; body: string }[] };

export function PlayClient({
  attemptId, compId, title, deadline, serverNow, questions, saved,
}: { attemptId: string; compId: string; title: string; deadline: string; serverNow: number; questions: Q[]; saved: Record<string, string> }) {
  const { t } = useLocale();
  const key = 'sx_ans_' + attemptId;
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [left, setLeft] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const offset = useRef(0);
  const sent = useRef(false);

  useEffect(() => {
    offset.current = serverNow - Date.now(); // corrects for a wrong phone clock
    let local: Record<string, string> = {};
    try { local = JSON.parse(sessionStorage.getItem(key) ?? '{}'); } catch {}
    setAnswers({ ...local, ...saved }); // what the server has saved wins
  }, [key, serverNow]);

  function send(a: Record<string, string>) {
    if (sent.current) return;
    sent.current = true;
    start(() => submitAttempt(attemptId, compId, a));
  }

  useEffect(() => {
    const end = new Date(deadline).getTime();
    const tick = () => setLeft(Math.max(0, end - (Date.now() + offset.current)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [deadline]);

  useEffect(() => {
    if (left === 0) send(JSON.parse(sessionStorage.getItem(key) ?? JSON.stringify(answers)));
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  function pick(qid: string, oid: string) {
    const next = { ...answers, [qid]: oid };
    setAnswers(next);
    try { sessionStorage.setItem(key, JSON.stringify(next)); } catch {}
    saveAnswer(attemptId, qid, oid).catch(() => {}); // saved on the server as you go
  }

  const q = questions[i];
  const answered = Object.keys(answers).length;
  const secs = left === null ? 0 : Math.ceil(left / 1000);
  const low = secs <= 60;

  return (
    <div className="mx-auto max-w-xl pt-4">
      <div className="sticky top-14 z-30 flex items-center justify-between rounded-xl bg-white/95 px-4 py-3 shadow-card backdrop-blur dark:bg-gray-900/95">
        <p className="truncate text-sm font-semibold text-textneutral">{title}</p>
        <p className={`font-heading text-xl font-bold tabular-nums ${low ? 'text-red-600' : 'text-primary'}`}>
          {left === null ? '--:--' : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`}
        </p>
      </div>

      <div className="mt-3 flex gap-1" aria-label={t('progressAria')}>
        {questions.map((x, n) => (
          <button key={x.id} onClick={() => setI(n)} aria-label={t('questionN').replace('{n}', String(n + 1))}
            className={`h-2 flex-1 rounded-full ${n === i ? 'bg-primary' : answers[x.id] ? 'bg-primary/40' : 'bg-gray-200 dark:bg-gray-700'}`} />
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-card dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs text-gray-400">{t('questionOf').replace('{n}', String(i + 1)).replace('{total}', String(questions.length))}</p>
        <p className="mt-1 whitespace-pre-line text-base font-semibold text-textneutral">{q.body}</p>
        <div className="mt-3 space-y-2">
          {q.options.map((o) => (
            <button key={o.id} onClick={() => pick(q.id, o.id)} disabled={pending}
              className={`min-h-[48px] w-full rounded-lg border px-4 py-3 text-left text-sm ${
                answers[q.id] === o.id ? 'border-primary bg-primary-50 font-semibold text-primary' : 'border-gray-200 hover:border-primary/50 dark:border-gray-700'
              }`}>
              {o.body}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} className="rounded-full border border-gray-300 px-4 py-2 text-sm disabled:opacity-40">{t('backLabel')}</button>
        {i < questions.length - 1 ? (
          <button onClick={() => setI(i + 1)} className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white">{t('nextLabel')}</button>
        ) : (
          <button
            disabled={pending}
            onClick={() => {
              const blank = questions.length - answered;
              if (blank === 0 || confirm(t('unansweredConfirm').replace('{n}', String(blank)))) send(answers);
            }}
            className="rounded-full bg-green-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
            {pending ? t('submittingLabel') : t('finishAndSubmit')}
          </button>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-gray-400">{t('answeredSummary').replace('{answered}', String(answered)).replace('{total}', String(questions.length))}</p>
    </div>
  );
}
