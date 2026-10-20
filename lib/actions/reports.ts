'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { authed } from './shared';

export async function reportIssue(kind: string, target: string, note: string): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Log in to send a report.' };
  const text = note.trim();
  if (text.length < 3) return { ok: false, message: 'Please describe the problem.' };
  const { error } = await supabase.from('reports').insert({ user_id: user.id, kind, target, note: text.slice(0, 1000) });
  return error ? { ok: false, message: 'Could not send your report.' } : { ok: true, message: 'Thank you. We will look into it.' };
}

export async function resolveReport(id: string) {
  const { supabase } = await authed();
  await supabase.from('reports').update({ resolved: true }).eq('id', id);
  revalidatePath('/admin/reports');
  redirect('/admin/reports');
}

