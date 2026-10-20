'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, Circle, FileText, UploadCloud } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { saveTutorProfile } from '@/lib/actions/people';
import type { TutorProfile } from '@/lib/types';
import { Field, Segmented, StepBar, TagInput, inputCls, panel } from '@/components/Form';
import { btn, btnGhost } from '@/components/Ui';
import { useLocale } from '@/components/LocaleProvider';

type Kind = 'id_doc' | 'education_doc' | 'exam_doc' | 'other_doc';
const DOCS: { kind: Kind; label: string; hint: string; required: boolean }[] = [
  { kind: 'id_doc', label: 'National ID', hint: 'A clear photo or scan of the front. Kebele ID, national ID or passport.', required: true },
  { kind: 'education_doc', label: 'Education proof', hint: 'Certificate, transcript, or your current university student ID.', required: true },
  { kind: 'exam_doc', label: 'National exam result', hint: 'Your Grade 12 national exam result, if you have it.', required: false },
  { kind: 'other_doc', label: 'Anything else that helps', hint: 'Teaching certificate, reference letter, awards.', required: false },
];
const STEPS = ['About you', 'Teaching', 'Education', 'Documents', 'Submit'];

export function TutorForm({ uid, profile }: { uid: string; profile: TutorProfile | null }) {
  const { t } = useLocale();
  const docText: Record<Kind, { label: string; hint: string }> = {
    id_doc: { label: t('docId'), hint: t('docIdHint') },
    education_doc: { label: t('docEdu'), hint: t('docEduHint') },
    exam_doc: { label: t('nationalExam'), hint: t('docExamHint') },
    other_doc: { label: t('docOther'), hint: t('docOtherHint') },
  };
  const p = profile;
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'Both' | 'Online' | 'In person'>(p?.mode ?? 'Both');
  const [docs, setDocs] = useState<Record<Kind, string>>({ id_doc: p?.id_doc ?? '', education_doc: p?.education_doc ?? '', exam_doc: p?.exam_doc ?? '', other_doc: p?.other_doc ?? '' });
  const [names, setNames] = useState<Partial<Record<Kind, string>>>({});
  const [busy, setBusy] = useState<Kind | null>(null);
  const [err, setErr] = useState('');
  const [check, setCheck] = useState<Record<string, boolean>>({});

  function read() {
    const f = new FormData(formRef.current!);
    const has = (k: string) => String(f.get(k) ?? '').trim().length > 0;
    setCheck({
      [t('fullLegalName')]: has('legal_name'), [t('phoneNumber')]: has('phone'), [t('gender')]: has('gender'), [t('city')]: has('city'), [t('subjectsLabel')]: has('subjects'),
      [t('levels')]: has('levels'), [t('highestEducation')]: has('education'), [t('docId')]: !!docs.id_doc, [t('docEdu')]: !!docs.education_doc,
    });
  }
  const go = (n: number) => { if (n === 4) read(); setStep(n); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  async function upload(kind: Kind, file?: File) {
    if (!file) return;
    setErr('');
    if (file.size > 5 * 1024 * 1024) return setErr(t('errFileBig'));
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setErr(t('errFileType'));
    setBusy(kind);
    const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${uid}/${kind}-${Date.now()}.${ext}`;
    const { error } = await createClient().storage.from('tutor-docs').upload(path, file, { contentType: file.type });
    setBusy(null);
    if (error) return setErr(t('errUpload'));
    setDocs((d) => ({ ...d, [kind]: path }));
    setNames((n) => ({ ...n, [kind]: file.name }));
  }

  const show = (n: number) => (step === n ? 'space-y-5' : 'hidden');
  const allGood = Object.values(check).length > 0 && Object.values(check).every(Boolean);

  return (
    <form ref={formRef} action={saveTutorProfile} className="mt-6">
      {DOCS.map((d) => <input key={d.kind} type="hidden" name={d.kind} value={docs[d.kind]} />)}
      <input type="hidden" name="mode" value={mode} />
      <StepBar steps={[t('stepAbout'), t('stepTeaching'), t('stepEducation'), t('stepDocuments'), t('stepSubmit')]} current={step} onGo={go} />

      <div className={`${panel} mt-6`}>
        <section className={show(0)}>
          <h2 className="font-heading text-xl font-bold text-textneutral">{t('tellUsWhoYouAre')}</h2>
          <p className="text-sm text-gray-500">{t('privacyNote')}</p>
          <Field label={t('fullLegalName')} required hint="Exactly as it is on your ID."><input name="legal_name" defaultValue={p?.legal_name} className={inputCls} /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('phoneNumber')} required><input name="phone" inputMode="tel" defaultValue={p?.phone} placeholder="09..." className={inputCls} /></Field>
            <Field label={t('gender')} required hint={t('genderHint')}><select name="gender" defaultValue={p?.gender ?? ''} className={inputCls}><option value="">{t('choose')}</option><option value="male">{t('male')}</option><option value="female">{t('female')}</option></select></Field>
            <Field label={t('city')} required><input name="city" defaultValue={p?.city} placeholder="Addis Ababa" className={inputCls} /></Field>
            <Field label={t('teachArea')} hint={t('areaHint')}><input name="area" defaultValue={p?.area} placeholder="Bole, Piassa, CMC..." className={inputCls} /></Field>
            <Field label={t('experienceYears')}><input name="experience_years" type="number" min={0} max={60} defaultValue={p?.experience_years ?? 0} className={inputCls} /></Field>
          </div>
        </section>

        <section className={show(1)}>
          <h2 className="font-heading text-xl font-bold text-textneutral">{t('whatDoYouTeach')}</h2>
          <Field label={t('subjectsLabel')} required hint={t('subjectsHint')}><TagInput name="subjects" defaultValue={p?.subjects} placeholder="Mathematics" suggestions={['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Amharic', 'ICT']} /></Field>
          <Field label={t('levels')} required><TagInput name="levels" defaultValue={p?.levels} placeholder="Grade 10" suggestions={['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'University']} /></Field>
          <Field label={t('languagesYouTeach')}><TagInput name="languages" defaultValue={p?.languages} placeholder="Amharic" suggestions={['Amharic', 'English', 'Afaan Oromo', 'Tigrinya']} /></Field>
          <div><span className="mb-1 block text-sm font-semibold text-textneutral">{t('howDoYouTeach')}</span><Segmented<'Both' | 'Online' | 'In person'> value={mode} onChange={setMode} options={[{ id: 'Both', label: t('onlineAndInPerson') }, { id: 'Online', label: t('onlineOnly') }, { id: 'In person', label: t('inPersonOnly') }]} /></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('ratePerSession')}><input name="rate" type="number" min={0} defaultValue={p?.rate ?? 0} className={inputCls} /></Field>
            <Field label={t('whenFree')}><input name="availability" defaultValue={p?.availability} placeholder="Weekday evenings, weekends" className={inputCls} /></Field>
          </div>
          <Field label={t('aboutYourTeaching')} hint={t('bioHint')}><textarea name="bio" rows={5} maxLength={800} defaultValue={p?.bio} className={inputCls} /></Field>
        </section>

        <section className={show(2)}>
          <h2 className="font-heading text-xl font-bold text-textneutral">{t('yourEducation')}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('highestEducation')} required>
              <select name="education" defaultValue={p?.education ?? ''} className={inputCls}>
                <option value="">{t('chooseOne')}</option>
                {['Grade 12 completed', 'Diploma', 'University student', 'Bachelor degree', 'Master degree', 'PhD'].map((e) => <option key={e}>{e}</option>)}
              </select>
            </Field>
            <Field label={t('institution')}><input name="institution" defaultValue={p?.institution} className={inputCls} /></Field>
            <Field label={t('fieldOfStudy')}><input name="field_of_study" defaultValue={p?.field_of_study} placeholder="Electrical Engineering" className={inputCls} /></Field>
            <Field label={t('nationalExam')} hint={t('examHint')}><input name="national_exam" defaultValue={p?.national_exam} className={inputCls} /></Field>
          </div>
        </section>

        <section className={show(3)}>
          <h2 className="font-heading text-xl font-bold text-textneutral">{t('uploadDocuments')}</h2>
          <p className="text-sm text-gray-500">{t('docsNote')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {DOCS.map((d) => (
              <label key={d.kind} className={`block cursor-pointer rounded-2xl border-2 border-dashed p-4 transition hover:border-primary ${docs[d.kind] ? 'border-green-400 bg-green-50/50 dark:bg-green-950/20' : 'border-gray-300 dark:border-gray-700'}`}>
                <span className="flex items-center gap-2 text-sm font-semibold text-textneutral">
                  {docs[d.kind] ? <FileText size={18} className="text-green-600" /> : <UploadCloud size={18} className="text-primary" />}
                  {docText[d.kind].label}{d.required && <span className="text-red-500">*</span>}
                </span>
                <span className="mt-1 block text-xs text-gray-500">{docText[d.kind].hint}</span>
                <span className="mt-2 block text-xs font-medium">
                  {busy === d.kind ? <span className="text-primary">{t('uploading')}</span> : docs[d.kind] ? <span className="text-green-700">{names[d.kind] ?? t('uploaded')}. {t('tapToReplace')}</span> : <span className="text-primary">{t('tapToChoose')}</span>}
                </span>
                <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload(d.kind, e.target.files?.[0])} />
              </label>
            ))}
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <label className="flex items-center gap-2 text-sm text-textneutral"><input type="checkbox" name="visible" defaultChecked={p?.visible ?? true} /> {t('showInDirectory')}</label>
        </section>

        <section className={show(4)}>
          <h2 className="font-heading text-xl font-bold text-textneutral">{t('readyToSubmit')}</h2>
          <p className="text-sm text-gray-500">{t('submitNote')}</p>
          <ul className="space-y-2 text-sm">
            {Object.entries(check).map(([k, ok]) => (
              <li key={k} className={`flex items-center gap-2 ${ok ? 'text-green-700' : 'text-red-600'}`}>{ok ? <CheckCircle2 size={16} /> : <Circle size={14} />} {k}</li>
            ))}
          </ul>
          {!allGood && <p className="text-sm text-gray-500">{t('missingNote')}</p>}
        </section>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {step > 0 && <button type="button" className={btnGhost} onClick={() => go(step - 1)}>{t('back')}</button>}
        {step < 4 && <button type="button" className={btn} onClick={() => go(step + 1)}>{t('next')}</button>}
        <button name="intent" value="save" disabled={!!busy} className={`${btnGhost} ml-auto`}>{t('saveDraft')}</button>
        {step === 4 && <button name="intent" value="submit" disabled={!!busy || !allGood} className={btn}>{t('submitForReview')}</button>}
      </div>
    </form>
  );
}
