import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const enc = encodeURIComponent;

/** Turns a database error into something a person can act on. */
export function dbError(e: { message?: string; code?: string }): string {
  const m = e.message ?? '';
  if (/schema cache|does not exist|column .* of relation/i.test(m))
    return 'The database is missing an update. Run the pending migration files in the Supabase SQL editor (see supabase/check-setup.sql). Details: ' + m;
  if (/row-level security|violates/i.test(m)) return 'You are not allowed to do that with this account. Details: ' + m;
  return 'Could not save: ' + m;
}

export async function authed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { supabase, user };
}
