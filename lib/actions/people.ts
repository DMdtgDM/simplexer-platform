'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { authed, dbError, enc } from './shared';

const list = (v: FormDataEntryValue | null) => String(v ?? '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 15);

export async function saveTutorProfile(formData: FormData) {
  const { supabase, user } = await authed();
  const f = (k: string) => String(formData.get(k) ?? '').trim();
  const doc = (k: string) => (f(k).startsWith(user.id + '/') ? f(k) : null); // only files in your own folder
  const row = {
    user_id: user.id, legal_name: f('legal_name'), phone: f('phone'), city: f('city'), area: f('area'),
    subjects: list(formData.get('subjects')), levels: list(formData.get('levels')), languages: list(formData.get('languages')),
    education: f('education'), institution: f('institution'), field_of_study: f('field_of_study'), national_exam: f('national_exam'),
    gender: ['male', 'female'].includes(f('gender')) ? f('gender') : null,
    experience_years: Math.min(60, Math.max(0, Number(f('experience_years')) || 0)), bio: f('bio').slice(0, 800),
    mode: ['Online', 'In person', 'Both'].includes(f('mode')) ? f('mode') : 'Both',
    rate: Math.max(0, Number(f('rate')) || 0), availability: f('availability'), visible: formData.get('visible') === 'on',
    id_doc: doc('id_doc'), education_doc: doc('education_doc'), exam_doc: doc('exam_doc'), other_doc: doc('other_doc'),
  };
  const submit = f('intent') === 'submit';
  if (submit) {
    const missing = [
      !row.legal_name && 'your full legal name', !row.phone && 'a phone number', !row.city && 'your city',
      !row.subjects.length && 'at least one subject', !row.levels.length && 'the levels you teach',
      !row.education && 'your education level', !row.gender && 'your gender (needed when a family asks for a male or female tutor)', !row.id_doc && 'a photo or scan of your national ID', !row.education_doc && 'a certificate or transcript',
    ].filter(Boolean);
    if (missing.length) redirect('/tutor?error=' + enc('To submit, add: ' + missing.join(', ') + '.'));
  }
  const { data: existing } = await supabase.from('tutor_profiles').select('status').eq('user_id', user.id).maybeSingle();
  if (existing?.status === 'suspended') redirect('/tutor?error=' + enc('Your tutor profile is suspended. Contact the Simplexer team.'));
  const { error } = await supabase.from('tutor_profiles').upsert(row, { onConflict: 'user_id' });
  if (error) redirect('/tutor?error=' + enc('Could not save your profile. Please try again.'));
  if (submit && (!existing || ['draft', 'rejected'].includes(existing.status))) {
    await supabase.from('tutor_profiles').update({ status: 'pending' }).eq('user_id', user.id);
  }
  revalidatePath('/tutor');
  redirect('/tutor?ok=' + enc(submit ? 'Submitted. We will review your documents and get back to you.' : 'Saved.'));
}

export async function reviewTutor(userId: string, formData: FormData) {
  const { supabase } = await authed();
  const status = String(formData.get('status'));
  if (!['pending', 'verified', 'rejected', 'suspended'].includes(status)) redirect('/admin/tutors');
  const score = Number(formData.get('score'));
  const { error } = await supabase.from('tutor_profiles').update({
    status, admin_note: String(formData.get('note') ?? '').trim(),
    assessment_score: score >= 1 && score <= 5 ? score : null, recommended: formData.get('recommended') === 'on',
  }).eq('user_id', userId);
  if (error) redirect('/admin/tutors?error=' + enc('Only admins can review tutors.'));
  revalidatePath('/admin/tutors'); revalidatePath('/tutors');
  redirect('/admin/tutors?ok=' + enc('Review saved.'));
}

export async function createRequest(formData: FormData) {
  const { supabase, user } = await authed();
  const f = (k: string) => String(formData.get(k) ?? '').trim();
  if (f('description').length < 3) redirect('/requests?error=' + enc('Please describe what you need.'));
  const { data: me } = await supabase.from('users').select('name').eq('id', user.id).maybeSingle();
  const { error } = await supabase.from('service_requests').insert({
    requester_id: user.id, requester_name: me?.name || 'User', kind: f('kind') === 'other' ? 'other' : 'tutor',
    contact_phone: f('contact_phone'), gender_pref: ['male', 'female'].includes(f('gender_pref')) ? f('gender_pref') : 'any',
    tutor_id: f('tutor_id') || null, subject: f('subject'), grade: f('grade') || null,
    mode: f('mode') === 'In person' ? 'In person' : 'Online', city: f('city') || null, area: f('area') || null,
    schedule: f('schedule') || null, budget: Math.max(0, Number(f('budget')) || 0), description: f('description').slice(0, 2000),
  });
  if (error) redirect('/requests?error=' + enc('Could not send your request.'));
  revalidatePath('/requests');
  redirect('/requests?ok=' + enc('Request sent. The Simplexer team will review it and reply here.'));
}

export async function updateRequest(id: string, formData: FormData) {
  const { supabase } = await authed();
  const status = String(formData.get('status'));
  if (!['new', 'reviewing', 'matched', 'closed'].includes(status)) redirect('/admin/requests');
  await supabase.from('service_requests').update({ status, admin_note: String(formData.get('note') ?? '').trim() }).eq('id', id);
  revalidatePath('/admin/requests'); revalidatePath('/requests');
  redirect('/admin/requests?ok=' + enc('Saved.'));
}

export async function convertRequestToJob(id: string) {
  const { supabase, user } = await authed();
  const { data: r } = await supabase.from('service_requests').select('*').eq('id', id).maybeSingle();
  if (!r || !r.subject) redirect('/admin/requests?error=' + enc('This request needs a subject before it can become a job.'));
  const { data: job, error } = await supabase.from('jobs').insert({
    poster_id: user.id, poster_name: r!.requester_name, subject: r!.subject, grade: r!.grade, mode: r!.mode, budget: r!.budget,
    gender_pref: (r as { gender_pref?: string }).gender_pref ?? 'any',
    description: r!.description, city: r!.city, area: r!.area, schedule: r!.schedule,
  }).select('id').single();
  if (error || !job) redirect('/admin/requests?error=' + enc('Only admins can create jobs.'));
  const reqPhone = (r as { contact_phone?: string }).contact_phone ?? '';
  if (reqPhone) await supabase.from('job_contacts').insert({ job_id: job!.id, contact_phone: reqPhone });
  await supabase.from('service_requests').update({ status: 'matched', job_id: job!.id }).eq('id', id);
  revalidatePath('/admin/requests'); revalidatePath('/jobs');
  redirect('/admin/requests?ok=' + enc('Job created and published.'));
}

export async function saveProfileSettings(formData: FormData) {
  const { supabase, user } = await authed();
  const text = (k: string, max: number) => String(formData.get(k) ?? '').trim().slice(0, max);
  await supabase.from('users').update({
    name: text('name', 80) || undefined,
    phone: text('phone', 30) || null,
    telegram_username: text('telegram_username', 40).replace(/^@/, '') || null,
    account_type: formData.get('account_type') === 'parent' ? 'parent' : 'student',
    visibility: formData.get('visibility') === 'public' ? 'public' : 'private',
    bio: text('bio', 300),
    notify_jobs: formData.get('notify_jobs') === 'on',
    notify_competitions: formData.get('notify_competitions') === 'on',
  }).eq('id', user.id);
  revalidatePath('/profile');
  redirect('/profile?ok=' + enc('Saved.'));
}

export async function markNotificationRead(id: string) {
  const { supabase, user } = await authed();
  await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', user.id);
  revalidatePath('/notifications');
}

export async function openNotification(id: string, href: string) {
  const { supabase, user } = await authed();
  await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', user.id);
  revalidatePath('/notifications');
  // Only same-site paths may be followed. '//evil.example' also starts
  // with '/', so a bare startsWith('/') check was an open redirect —
  // refuse protocol-relative and backslash links outright.
  const safe = !!href && href.startsWith('/') && !href.startsWith('//') && !href.includes('\\');
  redirect(safe ? href : '/notifications');
}

export async function deleteNotification(id: string) {
  const { supabase, user } = await authed();
  await supabase.from('notifications').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/notifications');
  redirect('/notifications?ok=' + enc('Notification removed.'));
}

export async function clearReadNotifications() {
  const { supabase, user } = await authed();
  await supabase.from('notifications').delete().eq('user_id', user.id).eq('is_read', true);
  revalidatePath('/notifications');
  redirect('/notifications?ok=' + enc('Read notifications cleared.'));
}

export async function markAllNotificationsRead() {
  const { supabase, user } = await authed();
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
  revalidatePath('/notifications');
  redirect('/notifications?ok=' + enc('All notifications marked as read.'));
}

export async function setTutorDirectoryPublic(on: boolean) {
  const { supabase } = await authed();
  const { error } = await supabase.from('site_settings').upsert({ key: 'tutor_directory_public', value: on ? 'true' : 'false' });
  if (error) redirect('/admin/review?error=' + enc(dbError(error)));
  revalidatePath('/tutors');
  redirect('/admin/review?ok=' + enc(on ? 'The tutor directory is now public.' : 'The tutor directory is now admin-only.'));
}
