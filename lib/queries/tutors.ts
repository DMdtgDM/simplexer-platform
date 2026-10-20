import { createClient } from '@/lib/supabase/server';
import type { TutorProfile, TutorCard, TutorPublic, ServiceRequest, PublicProfile } from '@/lib/types';

export async function getMyTutor(uid: string): Promise<TutorProfile | null> {
  const { data } = await (await createClient()).from('tutor_profiles').select('*').eq('user_id', uid).maybeSingle();
  return data;
}

export async function isVerifiedTutor(uid: string): Promise<boolean> {
  const { data } = await (await createClient()).from('tutor_profiles').select('status').eq('user_id', uid).maybeSingle();
  return data?.status === 'verified';
}

export async function getTutorDirectoryOpen(): Promise<boolean> {
  const { data } = await (await createClient()).from('site_settings').select('value').eq('key', 'tutor_directory_public').maybeSingle();
  return data?.value === 'true';
}

export async function getTutorDirectory(): Promise<TutorCard[]> {
  const { data } = await (await createClient()).rpc('tutor_directory');
  return (data as TutorCard[] | null) ?? [];
}

export async function getTutorPublic(id: string): Promise<TutorPublic | null> {
  const { data } = await (await createClient()).rpc('tutor_public', { uid: id });
  return ((data as TutorPublic[] | null) ?? [])[0] ?? null;
}

export async function getPublicProfile(id: string): Promise<PublicProfile | null> {
  const { data } = await (await createClient()).rpc('public_profile', { uid: id });
  return ((data as PublicProfile[] | null) ?? [])[0] ?? null;
}

export async function getTutorsForAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.from('tutor_profiles').select('*').order('submitted_at', { ascending: false, nullsFirst: false });
  const tutors = (data ?? []) as TutorProfile[];
  const { data: users } = await supabase.from('users').select('id, name, email').in('id', tutors.map((t) => t.user_id));
  const who = new Map((users ?? []).map((u) => [u.id as string, u as { name: string; email: string | null }]));
  const sign = async (path: string | null) =>
    path ? (await supabase.storage.from('tutor-docs').createSignedUrl(path, 900)).data?.signedUrl ?? null : null;
  const rows = await Promise.all(
    tutors.map(async (t) => ({
      ...t,
      name: who.get(t.user_id)?.name ?? '',
      email: who.get(t.user_id)?.email ?? '',
      links: { id: await sign(t.id_doc), education: await sign(t.education_doc), exam: await sign(t.exam_doc), other: await sign(t.other_doc) },
    }))
  );
  const rank = { pending: 0, draft: 3, rejected: 2, verified: 1, suspended: 4 } as const;
  return rows.sort((a, b) => rank[a.status] - rank[b.status]);
}

export async function getMyRequests(uid: string): Promise<ServiceRequest[]> {
  const { data } = await (await createClient()).from('service_requests').select('*').eq('requester_id', uid).order('created_at', { ascending: false });
  return data ?? [];
}

export async function getRequestsForAdmin(): Promise<ServiceRequest[]> {
  const { data } = await (await createClient()).from('service_requests').select('*').order('created_at', { ascending: false }).limit(200);
  return (data ?? []).sort((a: ServiceRequest, b: ServiceRequest) => Number(a.status === 'closed') - Number(b.status === 'closed'));
}

export async function getReviewCounts() {
  const supabase = await createClient();
  const head = { count: 'exact' as const, head: true };
  const [t, r, p] = await Promise.all([
    supabase.from('tutor_profiles').select('user_id', head).eq('status', 'pending'),
    supabase.from('service_requests').select('id', head).in('status', ['new', 'reviewing']),
    supabase.from('reports').select('id', head).eq('resolved', false),
  ]);
  return { tutors: t.count ?? 0, requests: r.count ?? 0, reports: p.count ?? 0 };
}
