'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function postJob(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('users').select('name, role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') redirect('/jobs?error=Only+admins+can+post+jobs');

  const subject = String(formData.get('subject') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (!subject || !description) redirect('/jobs?error=Add+a+subject+and+a+description');

  const inPerson = formData.get('mode') === 'In person';
  const city = String(formData.get('city') ?? '').trim();
  if (inPerson && !city) redirect('/jobs?error=In-person+jobs+need+a+city');

  const { data: job, error } = await supabase.from('jobs').insert({
    city: city || null,
    area: String(formData.get('area') ?? '').trim() || null,
    schedule: String(formData.get('schedule') ?? '').trim() || null,
    sessions_per_week: Math.min(14, Math.max(1, Number(formData.get('sessions_per_week')) || 1)),
    language: ['Amharic', 'English', 'Both'].includes(String(formData.get('language'))) ? String(formData.get('language')) : 'Amharic',
    gender_pref: ['male', 'female'].includes(String(formData.get('gender_pref'))) ? String(formData.get('gender_pref')) : 'any',
    poster_id: user.id,
    poster_name: String(formData.get('for') ?? '').trim() || profile?.name || 'Simplexer',
    subject,
    grade: String(formData.get('grade') ?? '').trim() || null,
    mode: formData.get('mode') === 'In person' ? 'In person' : 'Online',
    budget: Math.max(0, Number(formData.get('budget')) || 0),
    description,
  }).select('id').single();
  if (error || !job) redirect('/jobs?error=' + encodeURIComponent(error?.message ?? 'Could not post the job'));
  // The family phone lives in the locked job_contacts table (0022), never
  // on the publicly readable jobs row.
  const phone = String(formData.get('contact_phone') ?? '').trim();
  if (phone) await supabase.from('job_contacts').insert({ job_id: job.id, contact_phone: phone });

  revalidatePath('/jobs');
  redirect('/jobs');
}

export async function applyToJob(jobId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const message = String(formData.get('message') ?? '').trim();
  if (!message) redirect(`/jobs/${jobId}?error=Write+a+short+message`);

  // A parent may ask for a male or a female tutor. The tutor profile carries
  // the gender, set when the tutor registered; enforce the preference here.
  const { data: jobRow } = await supabase.from('jobs').select('gender_pref, status').eq('id', jobId).maybeSingle();
  if (jobRow?.gender_pref === 'male' || jobRow?.gender_pref === 'female') {
    const { data: tp } = await supabase.from('tutor_profiles').select('gender').eq('user_id', user.id).maybeSingle();
    if (!tp?.gender) redirect(`/jobs/${jobId}?error=` + encodeURIComponent('This job asks for a specific tutor. Add your gender in your tutor profile so we can match you.'));
    if (tp.gender !== jobRow.gender_pref) redirect(`/jobs/${jobId}?error=` + encodeURIComponent(`This job is for a ${jobRow.gender_pref} tutor only.`));
  }

  const { data: profile } = await supabase.from('users').select('name').eq('id', user.id).maybeSingle();
  const { error } = await supabase.from('job_applications').insert({
    job_id: jobId,
    applicant_id: user.id,
    applicant_name: profile?.name || 'Teacher',
    message,
    rate: Math.max(0, Number(formData.get('rate')) || 0),
  });
  if (error) {
    const text = error.code === '23505' ? 'You already applied to this job.' : 'Could not send your application.';
    redirect(`/jobs/${jobId}?error=` + encodeURIComponent(text));
  }

  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}`);
}

export async function acceptApplicant(jobId: string, applicantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // RLS only lets the poster (or an admin) update the job.
  await supabase
    .from('jobs')
    .update({ status: 'filled', tutor_id: applicantId })
    .eq('id', jobId)
    .eq('status', 'open');

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath('/jobs');
  redirect(`/jobs/${jobId}`);
}

export async function closeJob(jobId: string) {
  const supabase = await createClient();
  await supabase.from('jobs').update({ status: 'closed' }).eq('id', jobId).eq('status', 'open');
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath('/jobs');
  redirect(`/jobs/${jobId}`);
}

export async function reopenJob(jobId: string) {
  const supabase = await createClient();
  await supabase.from('jobs').update({ status: 'open' }).eq('id', jobId).eq('status', 'closed');
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath('/jobs');
  redirect(`/jobs/${jobId}`);
}

export async function deleteJob(jobId: string) {
  const supabase = await createClient();
  // RLS ("poster or admin deletes job") decides who may do this.
  await supabase.from('jobs').delete().eq('id', jobId);
  revalidatePath('/jobs');
  redirect('/jobs');
}

