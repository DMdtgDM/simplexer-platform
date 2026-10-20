'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/slugify';

const enc = encodeURIComponent;
const back = (kind: 'ok' | 'error', msg: string): never => redirect(`/admin/structure?${kind}=${enc(msg)}`);
const f = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

async function insert(table: 'grades' | 'subjects' | 'topics' | 'categories', row: Record<string, unknown>, name: string, parent?: [string, string]) {
  const supabase = await createClient();
  let q = supabase.from(table).select('id', { count: 'exact', head: true });
  if (parent) q = q.eq(parent[0], parent[1]);
  const { count } = await q;
  const id = randomUUID();
  const { error } = await supabase.from(table).insert({ id, ...row, name, slug: `${slugify(name) || table}-${id.slice(0, 4)}`, order: (count ?? 0) + 1 });
  if (error) back('error', /row-level security/i.test(error.message) ? 'Only admins can change the structure.' : error.message);
  revalidatePath('/admin/structure'); revalidatePath('/formal'); revalidatePath('/interests'); revalidatePath('/teach');
  back('ok', `${name} added.`);
}

export async function addGrade(fd: FormData) {
  if (f(fd, 'name').length < 2) back('error', 'Type a name for the grade.');
  await insert('grades', { tag: f(fd, 'tag') || null, exam_date: f(fd, 'exam_date') || null }, f(fd, 'name'));
}
export async function addSubject(fd: FormData) {
  if (!f(fd, 'grade_id') || f(fd, 'name').length < 2) back('error', 'Pick a grade and type a subject name.');
  await insert('subjects', { grade_id: f(fd, 'grade_id'), icon: f(fd, 'icon') || null }, f(fd, 'name'), ['grade_id', f(fd, 'grade_id')]);
}
export async function addTopic(fd: FormData) {
  if (!f(fd, 'subject_id') || f(fd, 'name').length < 2) back('error', 'Pick a subject and type a topic name.');
  await insert('topics', { subject_id: f(fd, 'subject_id'), description: f(fd, 'description') || null }, f(fd, 'name'), ['subject_id', f(fd, 'subject_id')]);
}
export async function addCategory(fd: FormData) {
  if (f(fd, 'name').length < 2) back('error', 'Type a name for the category.');
  await insert('categories', { icon: f(fd, 'icon') || null }, f(fd, 'name'));
}
export async function deleteStructure(table: 'grades' | 'subjects' | 'topics' | 'categories', id: string) {
  const { error } = await (await createClient()).from(table).delete().eq('id', id);
  if (error) back('error', /foreign key|violates/i.test(error.message) ? 'It still has content inside. Remove that first.' : error.message);
  revalidatePath('/admin/structure'); revalidatePath('/formal'); revalidatePath('/interests');
  back('ok', 'Removed.');
}
