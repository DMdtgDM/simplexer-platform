'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ImagePlus, Plus, CheckCircle2, Circle } from 'lucide-react';
import { Field, Segmented, StepBar, inputCls, panel } from '@/components/Form';
import { btn, btnGhost } from '@/components/Ui';
import { emptyLesson, type CourseDraft, type LessonDraft, type SaveResult } from '@/lib/teach-types';
import { saveSkillCourse, saveSchoolLessons, loadTopicLessons, createTopic } from '@/lib/teach-actions';
import type { Tree } from '@/lib/queries/teach';
import { useLocale } from '@/components/LocaleProvider';
import { LessonEditor } from './LessonEditor';
import { uploadMedia } from './media';

type Props = {
  mode: 'skill' | 'school';
  uid: string;
  isAdmin: boolean;
  categories: { id: string; name: string }[];
  tree: Tree;
  course?: Omit<CourseDraft, 'lessons'> & { status: string; rejection_reason: string | null };
  initialLessons: LessonDraft[];
  initialTopicId?: string;
};

export function CourseBuilder({ mode, uid, isAdmin, categories, tree: initialTree, course, initialLessons, initialTopicId }: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const school = mode === 'school';
  const steps = school ? [t('stepWhere'), t('stepLessons'), t('stepReview')] : [t('stepBasics'), t('stepLessons'), t('stepReview')];
  const LEVELS = [{ id: 'beginner', label: t('diffBeginner') }, { id: 'intermediate', label: t('diffIntermediate') }, { id: 'advanced', label: t('diffAdvanced') }] as const;
  const LANGS = [{ id: 'Amharic', label: t('langAmharic') }, { id: 'English', label: t('langEnglish') }, { id: 'Both', label: t('langBoth') }] as const;

  const [tree, setTree] = useState(initialTree);
  const found = useMemo(() => {
    for (const g of initialTree) for (const s of g.subjects) for (const tp of s.topics) if (tp.id === initialTopicId) return { g: g.id, s: s.id, t: tp.id };
    return null;
  }, [initialTree, initialTopicId]);
  const [gradeId, setGradeId] = useState(found?.g ?? '');
  const [subjectId, setSubjectId] = useState(found?.s ?? '');
  const [topicId, setTopicId] = useState(found?.t ?? '');
  const [newTopic, setNewTopic] = useState('');

  const [c, setC] = useState({
    id: course?.id, categoryId: course?.categoryId ?? '', title: course?.title ?? '', description: course?.description ?? '',
    difficulty: course?.difficulty ?? 'beginner', language: course?.language ?? 'Amharic', instructor: course?.instructor ?? '', coverImageUrl: course?.coverImageUrl ?? '',
  });
  const [lessons, setLessons] = useState<LessonDraft[]>(initialLessons.length ? initialLessons : mode === 'skill' && !course ? [emptyLesson()] : []);
  const [openIdx, setOpenIdx] = useState(0);
  const [step, setStep] = useState(school && !found ? 0 : course ? 1 : 0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [coverBusy, setCoverBusy] = useState(false);

  const snapshot = JSON.stringify({ c, lessons, topicId });
  const saved = useRef(snapshot);
  const dirty = snapshot !== saved.current;
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const upd = (i: number, patch: Partial<LessonDraft>) => setLessons((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const move = (i: number, d: -1 | 1) => { setLessons((ls) => { const n = [...ls]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; }); setOpenIdx(i + d); };
  const addLesson = () => { setLessons((ls) => [...ls, emptyLesson()]); setOpenIdx(lessons.length); };
  const dup = (i: number) => { setLessons((ls) => { const n = [...ls]; n.splice(i + 1, 0, { ...ls[i], id: undefined, title: `${ls[i].title} (copy)`, quiz: ls[i].quiz ? structuredClone(ls[i].quiz) : null }); return n; }); setOpenIdx(i + 1); };
  // A saved lesson deleted immediately in the editor (item 10): if the form
  // was clean, the deletion IS the new saved state, so the dirty marker
  // must follow it; if other edits are unsaved, the next save reconciles.
  const handleSavedDelete = (i: number) => {
    const next = lessons.filter((_, k) => k !== i);
    setLessons(next);
    setOpenIdx(-1);
    if (!dirty) saved.current = JSON.stringify({ c, lessons: next, topicId });
  };

  const grade = tree.find((g) => g.id === gradeId);
  const subject = grade?.subjects.find((s) => s.id === subjectId);
  const topic = subject?.topics.find((tp) => tp.id === topicId);

  async function chooseTopic(id: string) {
    setTopicId(id);
    const existing = await loadTopicLessons(id);
    if (existing.length) { setLessons(existing); setOpenIdx(0); }
  }

  const problems: string[] = [];
  if (school) { if (!topic) problems.push(t('problemPlace')); }
  else {
    if (c.title.trim().length < 3) problems.push(t('problemTitle'));
    if (!c.categoryId) problems.push(t('problemCategory'));
  }
  if (!lessons.length) problems.push(t('problemNoLessons'));
  lessons.forEach((l, i) => { if (!l.title.trim() || (!l.content.trim() && !l.video_url.trim())) problems.push(t('problemLesson').replace('{n}', String(i + 1))); });

  function done(r: SaveResult, goHome: boolean) {
    setMsg({ ok: r.ok, text: r.message });
    if (!r.ok) return;
    if (r.id) setC((x) => ({ ...x, id: r.id }));
    if (r.lessonIds) setLessons((ls) => ls.map((l, i) => ({ ...l, id: r.lessonIds![i] ?? l.id })));
    saved.current = '';
    setTimeout(() => { saved.current = JSON.stringify({ c: { ...c, id: r.id ?? c.id }, lessons: lessons.map((l, i) => ({ ...l, id: r.lessonIds?.[i] ?? l.id })), topicId }); }, 0);
    if (goHome) router.push('/teach?saved=1');
  }
  const save = (intent: 'draft' | 'submit') =>
    start(async () => {
      if (school) return done(await saveSchoolLessons(topicId, lessons), intent === 'submit');
      done(await saveSkillCourse({ ...c, lessons }, intent), intent === 'submit');
    });

  async function cover(f?: File) {
    if (!f) return;
    setCoverBusy(true);
    const r = await uploadMedia(uid, f, t);
    setCoverBusy(false);
    if (typeof r === 'string') setMsg({ ok: false, text: r }); else setC({ ...c, coverImageUrl: r.url });
  }

  const chip = (on: boolean) => `rounded-full border px-4 py-2 text-sm font-medium transition ${on ? 'border-primary bg-primary text-white shadow-card' : 'border-gray-200 bg-white text-textneutral hover:border-primary dark:border-gray-700 dark:bg-gray-900'}`;

  return (
    <div className="pb-28 pt-6">
      <Link href="/teach" className="text-xs text-gray-500">{t('backToTeach')}</Link>
      <h1 className="mt-2 font-heading text-2xl font-bold text-textneutral">{school ? t('addSchoolLessons') : c.id ? t('editYourCourse') : t('buildNewCourse')}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {school ? t('builderSchoolSub') : t('builderSkillSub')}
        {' '}{isAdmin ? t('teachAdminNote') : t('teachReviewNote')}
      </p>
      {course?.status === 'rejected' && course.rejection_reason && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"><b>{t('statusNeedsChanges')}:</b> {course.rejection_reason}</p>}

      <div className="mt-5"><StepBar steps={steps} current={step} onGo={setStep} /></div>

      <div className="mt-6 space-y-5">
        {step === 0 && !school && (
          <div className={`${panel} space-y-5`}>
            <Field label={t('courseTitleLabel')} required><input value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} placeholder={t('courseTitleHint')} className={`${inputCls} text-lg font-semibold`} /></Field>
            <Field label={t('courseDescLabel')} hint={t('courseDescHint')}><textarea value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} rows={4} className={inputCls} /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t('categoryLabel')} required>
                <select value={c.categoryId} onChange={(e) => setC({ ...c, categoryId: e.target.value })} className={inputCls}>
                  <option value="">{t('chooseCategory')}</option>
                  {categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
                {categories.length === 0 && <span className="mt-1 block text-xs text-red-600">{t('noCategoriesNote')}</span>}
              </Field>
              <Field label={t('taughtByLabel')} hint={t('taughtByHint')}><input value={c.instructor} onChange={(e) => setC({ ...c, instructor: e.target.value })} className={inputCls} /></Field>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-4">
              <div><span className="mb-1 block text-sm font-semibold text-textneutral">{t('levelLabel')}</span><Segmented value={c.difficulty} onChange={(v) => setC({ ...c, difficulty: v })} options={[...LEVELS]} /></div>
              <div><span className="mb-1 block text-sm font-semibold text-textneutral">{t('languageLabel')}</span><Segmented value={c.language} onChange={(v) => setC({ ...c, language: v })} options={[...LANGS]} /></div>
            </div>
            <div>
              <span className="mb-1 block text-sm font-semibold text-textneutral">{t('coverImageLabel')}</span>
              <div className="flex flex-wrap items-center gap-4">
                {c.coverImageUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.coverImageUrl} alt={t('coverPreview')} className="h-24 w-40 rounded-xl object-cover" /> : <div className="grid h-24 w-40 place-items-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800"><ImagePlus /></div>}
                <div className="space-y-2">
                  <label className={`${btnGhost} cursor-pointer`}>{coverBusy ? t('uploadingLabel') : t('uploadPicture')}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => cover(e.target.files?.[0])} /></label>
                  <input value={c.coverImageUrl} onChange={(e) => setC({ ...c, coverImageUrl: e.target.value })} placeholder={t('pasteImageLink')} className={inputCls} />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 0 && school && (
          <div className={`${panel} space-y-6`}>
            {tree.length === 0 && <p className="text-sm text-red-600">{t('noSubjectsAvailable')}</p>}
            <div><p className="mb-2 text-sm font-semibold text-textneutral">1. {t('stepGrade')}</p><div className="flex flex-wrap gap-2">{tree.map((g) => <button key={g.id} type="button" className={chip(g.id === gradeId)} onClick={() => { setGradeId(g.id); setSubjectId(''); setTopicId(''); }}>{g.name}</button>)}</div></div>
            {grade && <div><p className="mb-2 text-sm font-semibold text-textneutral">2. {t('stepSubject')}</p><div className="flex flex-wrap gap-2">{grade.subjects.map((s) => <button key={s.id} type="button" className={chip(s.id === subjectId)} onClick={() => { setSubjectId(s.id); setTopicId(''); }}>{s.name}</button>)}{grade.subjects.length === 0 && <p className="text-sm text-gray-500">{t('noSubjectsInGrade')}</p>}</div></div>}
            {subject && (
              <div>
                <p className="mb-2 text-sm font-semibold text-textneutral">3. {t('stepTopic')}</p>
                <div className="flex flex-wrap gap-2">{subject.topics.map((tp) => <button key={tp.id} type="button" className={chip(tp.id === topicId)} onClick={() => chooseTopic(tp.id)}>{tp.name}</button>)}</div>
                {isAdmin && (
                  <div className="mt-3 flex gap-2">
                    <input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder={t('addTopicPlaceholder')} className={inputCls} />
                    <button type="button" className={btnGhost} onClick={async () => {
                      const r = await createTopic(subject.id, newTopic);
                      setMsg({ ok: r.ok, text: r.message });
                      if (r.ok && r.id) { setTree((tr) => tr.map((g) => ({ ...g, subjects: g.subjects.map((s) => s.id === subject.id ? { ...s, topics: [...s.topics, { id: r.id!, name: newTopic.trim() }] } : s) }))); setTopicId(r.id); setNewTopic(''); }
                    }}>{t('addLabel')}</button>
                  </div>
                )}
              </div>
            )}
            {topic && <p className="rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary">{t('addingLessonsTo')} <b>{grade?.name} › {subject?.name} › {topic.name}</b>{lessons.length ? `. ${t('youHaveHere').replace('{n}', String(lessons.length))}` : '.'}</p>}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            {lessons.length === 0 && <p className={`${panel} text-sm text-gray-500`}>{t('noLessonsYetBuilder')}</p>}
            {lessons.map((l, i) => (
              <LessonEditor key={l.id ?? `new-${i}`} l={l} i={i} total={lessons.length} uid={uid} open={openIdx === i}
                onToggle={() => setOpenIdx(openIdx === i ? -1 : i)} update={(p) => upd(i, p)} move={(d) => move(i, d)} dup={() => dup(i)}
                del={() => { setLessons((ls) => ls.filter((_, k) => k !== i)); setOpenIdx(-1); }}
                onSavedDelete={() => handleSavedDelete(i)} />
            ))}
            <button type="button" onClick={addLesson} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 py-4 font-semibold text-primary hover:bg-primary-50"><Plus size={18} /> {t('addLessonBtn')}</button>
          </div>
        )}

        {step === 2 && (
          <div className={`${panel} space-y-4`}>
            <h2 className="font-heading text-lg font-bold text-textneutral">{school ? `${topic?.name ?? t('yourTopic')}` : c.title || t('yourCourse')}</h2>
            <p className="text-sm text-gray-500">{t('lessonsCountText').replace('{n}', String(lessons.length))} · {t('quizQuestionsCount').replace('{n}', String(lessons.reduce((n, l) => n + (l.quiz?.questions.length ?? 0), 0)))} · {t('aboutMinutes').replace('{n}', String(lessons.reduce((n, l) => n + l.est_minutes, 0)))}</p>
            <ul className="space-y-1.5 text-sm">
              {problems.length === 0 ? <li className="flex items-center gap-2 text-green-700"><CheckCircle2 size={16} /> {t('allFilledIn')}</li>
                : problems.map((p, pi) => <li key={pi} className="flex items-center gap-2 text-red-600"><Circle size={14} /> {p}</li>)}
            </ul>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-textneutral">{lessons.map((l, i) => <li key={i}>{l.title || t('untitledLesson')}</li>)}</ol>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 sm:bottom-0">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <p className={`min-w-0 flex-1 truncate text-sm ${msg ? (msg.ok ? 'text-green-700' : 'text-red-600') : 'text-gray-400'}`}>{msg?.text ?? (dirty ? t('unsavedChanges') : t('allChangesSaved'))}</p>
          {step > 0 && <button type="button" className={btnGhost} onClick={() => setStep(step - 1)}>{t('backLabel')}</button>}
          {!school && <button type="button" disabled={pending} className={btnGhost} onClick={() => save('draft')}>{pending ? t('savingLabel') : t('saveDraft')}</button>}
          {step < 2 ? <button type="button" className={btn} onClick={() => setStep(step + 1)}>{t('nextLabel')}</button>
            : <button type="button" disabled={pending || problems.length > 0} className={btn} onClick={() => save('submit')}>{pending ? t('savingLabel') : isAdmin ? t('publishLabel') : school ? t('saveSendReview') : t('submitForReview')}</button>}
        </div>
      </div>
    </div>
  );
}
