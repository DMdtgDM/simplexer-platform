'use client';

import { useState, useTransition } from 'react';
import { Bold, Italic, Heading2, List, Quote, Link2, Code, Sigma, ImagePlus, ChevronUp, ChevronDown, Copy, Trash2, Paperclip, X } from 'lucide-react';
import { LessonContentRenderer } from '@/components/LessonContentRenderer';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { Field, Segmented, inputCls } from '@/components/Form';
import { FONTS, SIZES, readingProps } from '@/lib/reading';
import type { LessonDraft, LessonVisibility, QuizDraft } from '@/lib/teach-types';
import { deleteMyLesson } from '@/lib/teach-actions';
import { useLocale } from '@/components/LocaleProvider';
import type { DictKey } from '@/lib/i18n/dictionary';
import { uploadMedia } from './media';

const TOOLS: { icon: typeof Bold; labelKey: DictKey; pre: string; post: string; ph: string }[] = [
  { icon: Bold, labelKey: 'toolBold', pre: '**', post: '**', ph: 'bold text' },
  { icon: Italic, labelKey: 'toolItalic', pre: '*', post: '*', ph: 'italic text' },
  { icon: Heading2, labelKey: 'toolHeading', pre: '\n## ', post: '\n', ph: 'Heading' },
  { icon: List, labelKey: 'toolList', pre: '\n- ', post: '', ph: 'List item' },
  { icon: Quote, labelKey: 'toolQuote', pre: '\n> ', post: '\n', ph: 'Quote or key idea' },
  { icon: Link2, labelKey: 'toolLink', pre: '[', post: '](https://)', ph: 'link text' },
  { icon: Code, labelKey: 'toolCode', pre: '`', post: '`', ph: 'code' },
  { icon: Sigma, labelKey: 'toolMath', pre: '$', post: '$', ph: 'x^2 + y^2 = z^2' },
];

const VISIBILITY: { id: LessonVisibility; labelKey: DictKey; noteKey: DictKey }[] = [
  { id: 'public', labelKey: 'visibilityPublic', noteKey: 'visibilityPublicNote' },
  { id: 'enrolled', labelKey: 'visibilityEnrolled', noteKey: 'visibilityEnrolledNote' },
  { id: 'private', labelKey: 'visibilityPrivate', noteKey: 'visibilityPrivateNote' },
];

function QuizEditor({ quiz, onChange }: { quiz: QuizDraft; onChange: (q: QuizDraft) => void }) {
  const { t } = useLocale();
  const [bulk, setBulk] = useState('');
  const setQ = (i: number, patch: Partial<QuizDraft['questions'][number]>) =>
    onChange({ questions: quiz.questions.map((q, k) => (k === i ? { ...q, ...patch } : q)) });
  const addBulk = () => {
    const parsed = bulk.split('\n').map((line) => line.split('|').map((p) => p.trim()).filter(Boolean))
      .filter((p) => p.length >= 3)
      .map((p) => ({ text: p[0], explanation: '', type: 'multiple_choice' as const, answer: '', options: p.slice(1).map((o) => ({ text: o.replace(/^\*\s*/, ''), correct: o.startsWith('*') })) }));
    if (parsed.length) onChange({ questions: [...quiz.questions, ...parsed] });
    setBulk('');
  };
  return (
    <div className="space-y-3">
      {quiz.questions.map((q, i) => (
        <div key={i} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <div className="flex gap-2">
            <input value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} placeholder={t('questionN').replace('{n}', String(i + 1))} className={inputCls} />
            <select value={q.type} aria-label={t('questionTypeAria')}
              onChange={(e) => {
                const type = e.target.value as typeof q.type;
                if (type === 'true_false') setQ(i, { type, options: [{ text: 'True', correct: true }, { text: 'False', correct: false }] });
                else if (type === 'short_answer') setQ(i, { type });
                else setQ(i, { type, options: q.options.length >= 2 ? q.options : [{ text: '', correct: true }, { text: '', correct: false }] });
              }}
              className={`${inputCls} w-auto shrink-0`}>
              <option value="multiple_choice">{t('questionTypeMc')}</option>
              <option value="true_false">{t('questionTypeTf')}</option>
              <option value="short_answer">{t('questionTypeSa')}</option>
            </select>
            <button type="button" aria-label={t('deleteQuestion')} onClick={() => onChange({ questions: quiz.questions.filter((_, k) => k !== i) })} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
          </div>
          {q.type === 'short_answer' ? (
            <div className="mt-2">
              <input value={q.answer} onChange={(e) => setQ(i, { answer: e.target.value })} placeholder={t('correctAnswerLabel')} className={inputCls} />
              <p className="mt-1 text-xs text-gray-400">{t('spellingNote')}</p>
            </div>
          ) : (
          <div className="mt-2 space-y-1.5">
            {q.options.map((o, j) => (
              <div key={j} className="flex items-center gap-2">
                <input type="radio" name={`correct-${i}`} checked={o.correct} aria-label={t('correctAnswerAria')}
                  onChange={() => setQ(i, { options: q.options.map((x, k) => ({ ...x, correct: k === j })) })} />
                <input value={o.text} onChange={(e) => setQ(i, { options: q.options.map((x, k) => (k === j ? { ...x, text: e.target.value } : x)) })}
                  placeholder={t('answerN').replace('{n}', String(j + 1))} className={inputCls} />
                {q.options.length > 2 && (
                  <button type="button" aria-label={t('removeAnswer')} onClick={() => setQ(i, { options: q.options.filter((_, k) => k !== j) })} className="text-gray-400 hover:text-red-600"><X size={14} /></button>
                )}
              </div>
            ))}
          </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {q.type === 'multiple_choice' && q.options.length < 6 && <button type="button" onClick={() => setQ(i, { options: [...q.options, { text: '', correct: false }] })} className="text-xs font-semibold text-primary">{t('addAnswer')}</button>}
            <input value={q.explanation} onChange={(e) => setQ(i, { explanation: e.target.value })} placeholder={t('whyRightPlaceholder')} className={`${inputCls} flex-1`} />
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange({ questions: [...quiz.questions, { text: '', explanation: '', type: 'multiple_choice' as const, answer: '', options: [{ text: '', correct: true }, { text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }] }] })}
        className="rounded-full border border-dashed border-primary px-4 py-1.5 text-sm font-semibold text-primary">{t('addQuestion')}</button>
      <details className="text-sm">
        <summary className="cursor-pointer text-gray-500">{t('pasteQuestions')}</summary>
        <p className="mt-1 text-xs text-gray-500">{t('pasteFormatNote')} <code>What is 12 x 8? | 86 | *96 | 98 | 104</code></p>
        <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={4} className={`${inputCls} mt-1`} />
        <button type="button" onClick={addBulk} className="mt-1 text-xs font-semibold text-primary">{t('addTheseQuestions')}</button>
      </details>
    </div>
  );
}

export function LessonEditor({
  l, i, total, uid, open, onToggle, update, move, dup, del, onSavedDelete,
}: {
  l: LessonDraft; i: number; total: number; uid: string; open: boolean; onToggle: () => void;
  update: (patch: Partial<LessonDraft>) => void; move: (d: -1 | 1) => void; dup: () => void; del: () => void;
  onSavedDelete?: () => void;
}) {
  const { t } = useLocale();
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [deleting, startDelete] = useTransition();
  const id = `lesson-text-${i}`;

  function insert(pre: string, post: string, ph: string) {
    const ta = document.getElementById(id) as HTMLTextAreaElement | null;
    if (!ta) return;
    const a = ta.selectionStart, b = ta.selectionEnd;
    const sel = l.content.slice(a, b) || ph;
    update({ content: l.content.slice(0, a) + pre + sel + post + l.content.slice(b) });
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(a + pre.length, a + pre.length + sel.length); });
  }
  async function pick(kind: 'image' | 'file', f?: File) {
    if (!f) return;
    setErr(''); setBusy(kind);
    const r = await uploadMedia(uid, f, t);
    setBusy('');
    if (typeof r === 'string') return setErr(r);
    if (kind === 'image') insert('\n![', `](${r.url})\n`, t('describeImage'));
    else update({ attachment_url: r.url, attachment_size_kb: r.sizeKb });
  }

  // Item 10: a saved lesson is deleted immediately (with confirmation and
  // the real result), not only when the whole form is saved later.
  function handleDelete() {
    if (!confirm(t('deleteLessonConfirm'))) return;
    if (!l.id) { del(); return; }
    setErr('');
    startDelete(async () => {
      const res = await deleteMyLesson(l.id as string);
      if (res.ok) onSavedDelete?.();
      else setErr(res.message);
    });
  }

  const r = readingProps(l.font, l.text_size);
  const visNote = VISIBILITY.find((v) => v.id === l.visibility) ?? VISIBILITY[0];
  return (
    <div className={`rounded-2xl border bg-white shadow-card dark:bg-gray-900 ${open ? 'border-primary/40' : 'border-gray-200 dark:border-gray-800'}`}>
      <div className="flex items-center gap-2 p-3">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-50 text-sm font-bold text-primary">{i + 1}</span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-textneutral">{l.title || t('untitledLesson')}</span>
            <span className="block truncate text-xs text-gray-400">{[l.video_url && t('kindVideo'), l.attachment_url && t('kindFile'), l.quiz?.questions.length ? t('quizQuestionsCount').replace('{n}', String(l.quiz.questions.length)) : '', `${l.est_minutes} ${t('minShort')}`].filter(Boolean).join(' · ')}</span>
          </span>
        </button>
        <button type="button" aria-label={t('moveUp')} disabled={i === 0} onClick={() => move(-1)} className="p-1 text-gray-400 hover:text-primary disabled:opacity-30"><ChevronUp size={18} /></button>
        <button type="button" aria-label={t('moveDown')} disabled={i === total - 1} onClick={() => move(1)} className="p-1 text-gray-400 hover:text-primary disabled:opacity-30"><ChevronDown size={18} /></button>
        <button type="button" aria-label={t('duplicateLesson')} onClick={dup} className="p-1 text-gray-400 hover:text-primary"><Copy size={16} /></button>
        <button type="button" aria-label={t('deleteLesson')} disabled={deleting} onClick={handleDelete} className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-40"><Trash2 size={16} /></button>
      </div>
      {err && <p role="alert" className="px-4 pb-2 text-sm text-red-600">{err}</p>}

      {open && (
        <div className="space-y-5 border-t border-gray-100 p-4 dark:border-gray-800">
          <Field label={t('lessonTitleLabel')} required><input value={l.title} onChange={(e) => update({ title: e.target.value })} placeholder={t('lessonTitlePlaceholder')} className={`${inputCls} text-base font-semibold`} /></Field>

          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-textneutral">{t('lessonContentLabel')}</span>
              <Segmented<'write' | 'preview'> small value={tab} onChange={setTab} options={[{ id: 'write', label: t('writeLabel') }, { id: 'preview', label: t('previewLabel') }]} />
            </div>
            {tab === 'write' ? (
              <>
                <div className="flex flex-wrap gap-1 rounded-t-xl border border-b-0 border-gray-200 bg-gray-50 p-1.5 dark:border-gray-700 dark:bg-gray-800">
                  {TOOLS.map((tool) => (
                    <button key={tool.labelKey} type="button" title={t(tool.labelKey)} aria-label={t(tool.labelKey)} onClick={() => insert(tool.pre, tool.post, tool.ph)} className="rounded-lg p-2 text-gray-600 hover:bg-white hover:text-primary dark:text-gray-300 dark:hover:bg-gray-900"><tool.icon size={16} /></button>
                  ))}
                  <label title={t('insertImage')} className="cursor-pointer rounded-lg p-2 text-gray-600 hover:bg-white hover:text-primary dark:text-gray-300">
                    <ImagePlus size={16} /><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick('image', e.target.files?.[0])} />
                  </label>
                  {busy === 'image' && <span className="self-center text-xs text-gray-500">{t('uploadingLabel')}</span>}
                </div>
                <textarea id={id} value={l.content} onChange={(e) => update({ content: e.target.value })} rows={12}
                  placeholder={t('contentPlaceholder')}
                  className={`${inputCls} rounded-t-none font-mono`} />
              </>
            ) : (
              <div className="min-h-[14rem] rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                {l.content.trim() ? <LessonContentRenderer content={l.content} font={l.font} size={l.text_size} /> : <p className="text-sm text-gray-400">{t('nothingToPreview')}</p>}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('videoLabel')} hint={t('videoHint')}>
              <input value={l.video_url} onChange={(e) => update({ video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." className={inputCls} />
            </Field>
            <Field label={t('minutesToComplete')}><input type="number" min={1} max={240} value={l.est_minutes} onChange={(e) => update({ est_minutes: Number(e.target.value) || 1 })} className={inputCls} /></Field>
          </div>
          {l.video_url.trim() && <div className="max-w-md"><YouTubeEmbed url={l.video_url} title={l.title || 'Video preview'} /></div>}

          <div>
            <span className="mb-1 block text-sm font-semibold text-textneutral">{t('attachmentLabel')}</span>
            {l.attachment_url ? (
              <div className="flex items-center gap-2 rounded-xl bg-primary-50 px-3 py-2 text-sm text-primary">
                <Paperclip size={16} /> <a href={l.attachment_url} target="_blank" rel="noopener noreferrer" className="underline">{t('fileAttached')}</a>
                {l.attachment_size_kb ? <span className="text-xs">({l.attachment_size_kb} KB)</span> : null}
                <button type="button" onClick={() => update({ attachment_url: '', attachment_size_kb: null })} className="ml-auto text-xs underline">{t('removeLabel')}</button>
              </div>
            ) : (
              <input type="file" accept="application/pdf" onChange={(e) => pick('file', e.target.files?.[0])} className="text-sm" />
            )}
            {busy === 'file' && <p className="text-xs text-gray-500">{t('uploadingLabel')}</p>}
            {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
          </div>

          <div>
            <span className="mb-1 block text-sm font-semibold text-textneutral">{t('visibilityLabel')}</span>
            <Segmented<LessonVisibility> value={l.visibility} onChange={(v) => update({ visibility: v })} options={VISIBILITY.map((v) => ({ id: v.id, label: t(v.labelKey) }))} />
            <p className="mt-1.5 text-xs text-gray-500">{t(visNote.noteKey)}</p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
            <p className="text-sm font-semibold text-textneutral">{t('howStudentsRead')}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
              <div><span className="mr-2 text-xs text-gray-500">{t('fontLabel')}</span><Segmented small value={l.font} onChange={(v) => update({ font: v })} options={FONTS.map((f) => ({ id: f.id, label: f.label }))} /></div>
              <div><span className="mr-2 text-xs text-gray-500">{t('sizeLabel')}</span><Segmented small value={l.text_size} onChange={(v) => update({ text_size: v })} options={SIZES} /></div>
            </div>
            <p style={r.style} className={`mt-3 rounded-lg bg-white p-3 text-textneutral dark:bg-gray-900 ${r.className.includes('prose-lg') ? 'text-lg' : r.className.includes('prose-sm') ? 'text-sm' : 'text-base'} ${r.className.includes('font-serif') ? 'font-serif' : ''} ${r.className.includes('font-mono') ? 'font-mono' : ''}`}>
              The lesson will look like this. ይህ ትምህርት እንዲህ ይታያል።
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-textneutral">{t('quizForLesson')}</span>
              {l.quiz ? <button type="button" onClick={() => update({ quiz: null })} className="text-xs text-gray-500 underline">{t('removeQuizEditor')}</button>
                : <button type="button" onClick={() => update({ quiz: { questions: [{ text: '', explanation: '', type: 'multiple_choice' as const, answer: '', options: [{ text: '', correct: true }, { text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }] }] } })} className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary">{t('addQuiz')}</button>}
            </div>
            {l.quiz && <QuizEditor quiz={l.quiz} onChange={(q) => update({ quiz: q })} />}
            {l.quiz === null && <p className="text-xs text-gray-500">{t('quizOptionalNote')}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
