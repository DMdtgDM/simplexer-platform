import { createClient } from '@/lib/supabase/server';
import type { Job, JobApplication } from '@/lib/types';

export type JobStatusFilter = 'open' | 'closed';

export async function getJobs(f: { q?: string; mode?: string; city?: string; status?: string } = {}): Promise<Job[]> {
  const supabase = await createClient();
  let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });
  const clean = (v?: string) => (v ?? '').replace(/[%,()]/g, ' ').trim();
  // "Closed only" means no longer taking a tutor: filled OR closed.
  if (f.status === 'open') query = query.eq('status', 'open');
  else if (f.status === 'closed') query = query.in('status', ['filled', 'closed']);
  if (f.mode === 'Online' || f.mode === 'In person') query = query.eq('mode', f.mode);
  if (clean(f.city)) query = query.ilike('city', `%${clean(f.city)}%`);
  if (clean(f.q)) query = query.or(`subject.ilike.%${clean(f.q)}%,description.ilike.%${clean(f.q)}%`);
  const { data } = await query;
  return data ?? [];
}

export async function getJob(id: string): Promise<Job | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('jobs').select('*').eq('id', id).maybeSingle();
  return data;
}

// RLS decides what comes back: the poster sees every applicant, a teacher only their own.
export async function getApplications(jobId: string): Promise<JobApplication[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('job_applications')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at');
  return data ?? [];
}
