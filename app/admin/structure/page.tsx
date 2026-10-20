import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries/progress';
import { getStructureTree } from '@/lib/queries/teach';
import { getCategories } from '@/lib/queries/courses';
import { addGrade, addSubject, addTopic, addCategory, deleteStructure } from '@/lib/structure-actions';
import { ConfirmForm } from '@/components/ConfirmForm';
import { Field, inputCls, panel } from '@/components/Form';
import { btn } from '@/components/Ui';
import { serverT } from '@/lib/i18n/server';

export const metadata = { title: 'Grades and subjects — Simplexer' };
export const dynamic = 'force-dynamic';

const Del = ({ table, id, name }: { table: 'grades' | 'subjects' | 'topics' | 'categories'; id: string; name: string }) => (
  <ConfirmForm action={deleteStructure.bind(null, table, id)} message={`Remove "${name}"? It only works if nothing is inside it.`} className="inline">
    <button className="text-xs text-red-600 underline">Remove</button>
  </ConfirmForm>
);

export default async function StructurePage(props: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.profile?.role !== 'admin') redirect('/');
  const { t } = await serverT();
  const [tree, categories] = await Promise.all([getStructureTree(), getCategories()]);
  const subjects = tree.flatMap((g) => g.subjects.map((s) => ({ id: s.id, label: `${g.name} › ${s.name}` })));

  return (
    <div className="pt-6 pb-10">
      <Link href="/admin/review" className="text-xs text-gray-500">Admin review</Link>
      <h1 className="mt-2 font-heading text-2xl font-bold text-textneutral">{t('gradesSubjects')}</h1>
      <p className="mt-1 text-sm text-gray-500">This is the shape of the whole site. Add a grade, then its subjects, then topics inside each subject. Teachers pick from these when they add lessons.</p>
      {searchParams.ok && <p className="mt-3 text-sm text-green-700">{searchParams.ok}</p>}
      {searchParams.error && <p className="mt-3 text-sm text-red-600">{searchParams.error}</p>}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <form action={addGrade} className={`${panel} space-y-3`}>
          <h2 className="font-heading font-bold text-textneutral">Add a grade</h2>
          <Field label="Name" required><input name="name" required placeholder="Grade 9" className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label"><input name="tag" placeholder="e.g. Exam year" className={inputCls} /></Field>
            <Field label="Exam date"><input name="exam_date" type="date" className={inputCls} /></Field>
          </div>
          <button className={btn}>Add grade</button>
        </form>
        <form action={addSubject} className={`${panel} space-y-3`}>
          <h2 className="font-heading font-bold text-textneutral">Add a subject</h2>
          <Field label="Grade" required><select name="grade_id" required className={inputCls}><option value="">Choose a grade</option>{tree.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" required><input name="name" required placeholder="Physics" className={inputCls} /></Field>
            <Field label="Icon name"><input name="icon" placeholder="e.g. Atom" className={inputCls} /></Field>
          </div>
          <button className={btn}>Add subject</button>
        </form>
        <form action={addTopic} className={`${panel} space-y-3`}>
          <h2 className="font-heading font-bold text-textneutral">Add a topic</h2>
          <Field label="Subject" required><select name="subject_id" required className={inputCls}><option value="">Choose a subject</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
          <Field label="Name" required><input name="name" required placeholder="Kinematics" className={inputCls} /></Field>
          <Field label="Short description"><input name="description" className={inputCls} /></Field>
          <button className={btn}>Add topic</button>
        </form>
        <form action={addCategory} className={`${panel} space-y-3`}>
          <h2 className="font-heading font-bold text-textneutral">Add a skill category</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" required><input name="name" required placeholder="Programming" className={inputCls} /></Field>
            <Field label="Icon name"><input name="icon" placeholder="e.g. Code" className={inputCls} /></Field>
          </div>
          <button className={btn}>Add category</button>
        </form>
      </div>

      <h2 className="mt-8 font-heading text-lg font-bold text-textneutral">School track now</h2>
      <div className="mt-3 space-y-3">
        {tree.length === 0 && <p className="text-sm text-gray-400">No grades yet.</p>}
        {tree.map((g) => (
          <div key={g.id} className={panel}>
            <p className="flex items-center justify-between font-semibold text-textneutral">{g.name} <Del table="grades" id={g.id} name={g.name} /></p>
            <div className="mt-2 space-y-2 border-l-2 border-primary-50 pl-4">
              {g.subjects.length === 0 && <p className="text-xs text-gray-400">No subjects yet.</p>}
              {g.subjects.map((s) => (
                <div key={s.id}>
                  <p className="flex items-center justify-between text-sm font-medium text-textneutral">{s.name} <Del table="subjects" id={s.id} name={s.name} /></p>
                  <ul className="mt-1 space-y-0.5 pl-3 text-sm text-gray-500">
                    {s.topics.map((t) => <li key={t.id} className="flex items-center justify-between">{t.name} <Del table="topics" id={t.id} name={t.name} /></li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-heading text-lg font-bold text-textneutral">Skill categories now</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {categories.length === 0 && <p className="text-sm text-gray-400">No categories yet.</p>}
        {categories.map((c) => <span key={c.id} className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-sm text-primary">{c.name} <Del table="categories" id={c.id} name={c.name} /></span>)}
      </div>
    </div>
  );
}
