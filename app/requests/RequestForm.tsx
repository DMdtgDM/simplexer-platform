'use client';

import { useState } from 'react';
import { createRequest } from '@/lib/actions/people';
import { Field, Segmented, inputCls, panel } from '@/components/Form';
import { GRADE_LEVELS } from '@/lib/grade-levels';
import { btn } from '@/components/Ui';
import { useLocale } from '@/components/LocaleProvider';

export function RequestForm({ tutor }: { tutor: { user_id: string; name: string; subjects: string[] } | null }) {
  const { t } = useLocale();
  const [kind, setKind] = useState<'tutor' | 'other'>('tutor');
  const [mode, setMode] = useState<'Online' | 'In person'>('Online');
  return (
    <form action={createRequest} className={`${panel} mt-4 space-y-5`}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="mode" value={mode} />
      {tutor && <><input type="hidden" name="tutor_id" value={tutor.user_id} /><p className="rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary">{t('askingForTutor')} <b>{tutor.name}</b> ({tutor.subjects.join(', ')})</p></>}
      <div><span className="mb-1 block text-sm font-semibold text-textneutral">{t('whatDoYouNeed')}</span>
        <Segmented<'tutor' | 'other'> value={kind} onChange={setKind} options={[{ id: 'tutor', label: t('aTutor') }, { id: 'other', label: t('somethingElse') }]} /></div>

      {kind === 'tutor' && (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('subject')} required><input name="subject" defaultValue={tutor?.subjects[0]} placeholder="Mathematics" className={inputCls} /></Field>
            <Field label={t('gradeLevel')}><select name="grade" className={inputCls}><option value="">{t('choose')}</option>{GRADE_LEVELS.map((g) => <option key={g}>{g}</option>)}</select></Field>
          </div>
          <div><span className="mb-1 block text-sm font-semibold text-textneutral">{t('whereQ')}</span><Segmented<'Online' | 'In person'> value={mode} onChange={setMode} options={[{ id: 'Online', label: t('online') }, { id: 'In person', label: t('inPerson') }]} /></div>
          {mode === 'In person' && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t('city')}><input name="city" placeholder="Addis Ababa" className={inputCls} /></Field>
              <Field label={t('area')}><input name="area" placeholder="Bole, near Edna Mall" className={inputCls} /></Field>
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('scheduleLabel')}><input name="schedule" placeholder="Mon and Wed, 4 to 6 pm" className={inputCls} /></Field>
            <Field label={t('budgetPerSession')}><input name="budget" type="number" min={0} className={inputCls} /></Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('yourPhone')} required hint={t('phoneHintRequest')}><input name="contact_phone" inputMode="tel" placeholder="09..." className={inputCls} /></Field>
            <Field label={t('tutorPreference')}><select name="gender_pref" className={inputCls}><option value="any">{t('maleOrFemale')}</option><option value="male">{t('maleTutor')}</option><option value="female">{t('femaleTutor')}</option></select></Field>
          </div>
        </>
      )}
      <Field label={kind === 'tutor' ? t('tellUsMore') : t('tellUsWhatYouNeed')} required hint={kind === 'tutor' ? t('descHintTutor') : t('descHintOther')}>
        <textarea name="description" required rows={5} className={inputCls} />
      </Field>
      <button className={btn}>{t('sendRequest')}</button>
    </form>
  );
}
