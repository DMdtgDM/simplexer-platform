-- Tutor job board: students/parents post a need, teachers apply, the poster accepts one.
create type job_status as enum ('open', 'filled', 'closed');

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.users (id) on delete cascade,
  poster_name text not null default '',
  subject text not null,
  grade text,
  mode text not null default 'Online',
  budget int not null default 0 check (budget >= 0),
  description text not null,
  status job_status not null default 'open',
  tutor_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index jobs_status_idx on public.jobs (status, created_at desc);

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  applicant_id uuid not null references public.users (id) on delete cascade,
  applicant_name text not null default '',
  message text not null,
  rate int not null default 0 check (rate >= 0),
  created_at timestamptz not null default now(),
  unique (job_id, applicant_id)
);
create index job_applications_job_idx on public.job_applications (job_id);

alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;

create policy "anyone reads jobs" on public.jobs for select using (true);
create policy "signed-in users post jobs" on public.jobs
  for insert with check (auth.uid() = poster_id);
create policy "poster or admin updates job" on public.jobs
  for update using (auth.uid() = poster_id or public.is_admin(auth.uid()));
create policy "poster or admin deletes job" on public.jobs
  for delete using (auth.uid() = poster_id or public.is_admin(auth.uid()));

create policy "teachers apply to open jobs" on public.job_applications
  for insert with check (
    auth.uid() = applicant_id
    and public.is_teacher_or_admin(auth.uid())
    and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open')
  );
create policy "applicant, poster or admin reads applications" on public.job_applications
  for select using (
    auth.uid() = applicant_id
    or public.is_admin(auth.uid())
    or exists (select 1 from public.jobs j where j.id = job_id and j.poster_id = auth.uid())
  );
create policy "applicant withdraws application" on public.job_applications
  for delete using (auth.uid() = applicant_id);
