-- Tutor directory (verified by admins), service requests from parents/students, and profile visibility.

-- 1. Account type and visibility for every user. Role (student/teacher/admin) stays admin-controlled.
alter table public.users
  add column account_type text not null default 'student' check (account_type in ('student', 'parent')),
  add column visibility text not null default 'private' check (visibility in ('private', 'public')),
  add column bio text not null default '' check (char_length(bio) <= 300);

-- 2. Tutor profiles
create table public.tutor_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'pending', 'verified', 'rejected', 'suspended')),
  legal_name text not null default '',
  phone text not null default '',
  city text not null default '',
  area text not null default '',
  subjects text[] not null default '{}',
  levels text[] not null default '{}',
  languages text[] not null default '{}',
  education text not null default '',
  institution text not null default '',
  field_of_study text not null default '',
  national_exam text not null default '',
  experience_years int not null default 0 check (experience_years between 0 and 60),
  bio text not null default '' check (char_length(bio) <= 800),
  mode text not null default 'Both' check (mode in ('Online', 'In person', 'Both')),
  rate int not null default 0 check (rate >= 0),
  availability text not null default '',
  visible boolean not null default true,
  id_doc text, education_doc text, exam_doc text, other_doc text,
  admin_note text not null default '',
  assessment_score int check (assessment_score between 1 and 5),
  recommended boolean not null default false,
  submitted_at timestamptz, verified_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.tutor_profiles enable row level security;
create policy "tutors read own profile" on public.tutor_profiles for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "tutors create own profile" on public.tutor_profiles for insert with check (user_id = auth.uid());
create policy "tutors edit own profile" on public.tutor_profiles for update using (user_id = auth.uid());
create policy "admins manage tutor profiles" on public.tutor_profiles for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create function public.guard_tutor_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    if tg_op = 'INSERT' then
      new.status := 'draft'; new.admin_note := ''; new.assessment_score := null; new.recommended := false; new.verified_at := null;
    else
      new.admin_note := old.admin_note; new.assessment_score := old.assessment_score;
      new.recommended := old.recommended; new.verified_at := old.verified_at;
      if new.status is distinct from old.status and not (old.status in ('draft', 'rejected') and new.status = 'pending') then
        new.status := old.status;
      end if;
      if old.status = 'verified' and (
        new.legal_name is distinct from old.legal_name or new.id_doc is distinct from old.id_doc
        or new.education_doc is distinct from old.education_doc or new.exam_doc is distinct from old.exam_doc
        or new.other_doc is distinct from old.other_doc or new.education is distinct from old.education
        or new.institution is distinct from old.institution or new.field_of_study is distinct from old.field_of_study
        or new.national_exam is distinct from old.national_exam
      ) then new.status := 'pending'; end if;
      if new.status = 'pending' and old.status <> 'pending' then new.submitted_at := now(); end if;
    end if;
  elsif tg_op = 'UPDATE' and new.status = 'verified' and old.status <> 'verified' then
    new.verified_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger guard_tutor_profile before insert or update on public.tutor_profiles
  for each row execute function public.guard_tutor_profile();

-- Public directory: verified and visible tutors only, no contact details, no documents.
create function public.tutor_directory()
returns table (user_id uuid, name text, city text, subjects text[], levels text[], languages text[], mode text, rate int, experience_years int, education text, recommended boolean)
language sql stable security definer set search_path = public as $$
  select t.user_id, public.display_name(u.name), t.city, t.subjects, t.levels, t.languages, t.mode, t.rate, t.experience_years, t.education, t.recommended
  from public.tutor_profiles t join public.users u on u.id = t.user_id
  where t.status = 'verified' and t.visible
  order by t.recommended desc, t.verified_at desc
$$;
create function public.tutor_public(uid uuid)
returns table (user_id uuid, name text, city text, subjects text[], levels text[], languages text[], mode text, rate int, experience_years int, education text, field_of_study text, bio text, availability text, recommended boolean)
language sql stable security definer set search_path = public as $$
  select t.user_id, public.display_name(u.name), t.city, t.subjects, t.levels, t.languages, t.mode, t.rate, t.experience_years, t.education, t.field_of_study, t.bio, t.availability, t.recommended
  from public.tutor_profiles t join public.users u on u.id = t.user_id
  where t.user_id = uid and t.status = 'verified' and t.visible
$$;
grant execute on function public.tutor_directory(), public.tutor_public(uuid) to anon, authenticated;

-- Verified tutors may apply to jobs (teachers and admins still can).
drop policy "teachers apply to open jobs" on public.job_applications;
create policy "verified tutors and teachers apply to open jobs" on public.job_applications
  for insert with check (
    auth.uid() = applicant_id
    and (public.is_teacher_or_admin(auth.uid())
         or exists (select 1 from public.tutor_profiles t where t.user_id = auth.uid() and t.status = 'verified'))
    and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open')
  );

-- 3. Requests from parents and students
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  requester_name text not null default '',
  kind text not null default 'tutor' check (kind in ('tutor', 'other')),
  tutor_id uuid references public.users (id) on delete set null,
  subject text not null default '',
  grade text, mode text not null default 'Online', city text, area text, schedule text,
  budget int not null default 0 check (budget >= 0),
  description text not null check (char_length(description) between 3 and 2000),
  status text not null default 'new' check (status in ('new', 'reviewing', 'matched', 'closed')),
  admin_note text not null default '',
  job_id uuid references public.jobs (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.service_requests enable row level security;
create policy "send own requests" on public.service_requests for insert to authenticated with check (requester_id = auth.uid() and status = 'new');
create policy "read own requests, admins read all" on public.service_requests for select using (requester_id = auth.uid() or public.is_admin(auth.uid()));
create policy "admins handle requests" on public.service_requests for update using (public.is_admin(auth.uid()));

-- 4. Student profile visibility: a public page only exists if the person turned it on.
create function public.public_profile(uid uuid) returns table (name text, bio text, grade_name text, account_type text)
language sql stable security definer set search_path = public as $$
  select public.display_name(u.name), u.bio, g.name, u.account_type
  from public.users u left join public.grades g on g.id = u.grade_id
  where u.id = uid and u.visibility = 'public' and auth.uid() is not null
$$;
grant execute on function public.public_profile(uuid) to authenticated;

-- 5. Private storage for tutor documents. Each person can only touch their own folder; admins can read all.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tutor-docs', 'tutor-docs', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "tutors upload own documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'tutor-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "tutors update own documents" on storage.objects for update to authenticated
  using (bucket_id = 'tutor-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "tutors delete own documents" on storage.objects for delete to authenticated
  using (bucket_id = 'tutor-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners and admins read documents" on storage.objects for select to authenticated
  using (bucket_id = 'tutor-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin(auth.uid())));
