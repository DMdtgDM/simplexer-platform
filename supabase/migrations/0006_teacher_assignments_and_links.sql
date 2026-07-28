-- ============================================================================
-- Formal Track teacher assignments + full teacher edit/delete rights +
-- admin-managed community links (Discord/Telegram/resources).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- lessons: extend the review-workflow columns (previously only meaningful
-- for course_id lessons via the parent course's status) so that Formal
-- Track (topic_id) lessons can also be submitted by an assigned teacher and
-- reviewed individually. Existing rows default to 'approved' so nothing
-- currently live changes visibility.
-- ---------------------------------------------------------------------------
alter table public.lessons
  add column status course_status not null default 'approved',
  add column submitted_by uuid references public.users (id) on delete set null,
  add column rejection_reason text;

create index lessons_status_idx on public.lessons (status);
create index lessons_submitted_by_idx on public.lessons (submitted_by);

-- ---------------------------------------------------------------------------
-- teacher_assignments — which (grade, subject) combinations a teacher is
-- allowed to submit Formal Track lessons into. Admin-managed only.
-- ---------------------------------------------------------------------------
create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (teacher_id, subject_id)
);

create index teacher_assignments_teacher_idx on public.teacher_assignments (teacher_id);

alter table public.teacher_assignments enable row level security;

create policy "read own teaching assignments" on public.teacher_assignments
  for select using (auth.uid() = teacher_id);

create policy "admin read all teaching assignments" on public.teacher_assignments
  for select using (public.is_admin(auth.uid()));

create policy "admin manage teaching assignments" on public.teacher_assignments
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- community_links — admin-editable list of external links (Discord,
-- Telegram, resource pages, etc.) shown on the /community page.
-- ---------------------------------------------------------------------------
create table public.community_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  icon text,
  "order" int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.community_links enable row level security;

create policy "public read community links" on public.community_links
  for select using (true);

create policy "admin manage community links" on public.community_links
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

insert into public.community_links (label, url, icon, "order") values
  ('Telegram', 'https://t.me/simplexer101', 'send', 1);
-- Add your Discord invite from /admin → Links once you have one.

-- ---------------------------------------------------------------------------
-- Formal Track lesson visibility: replace the old fully-public policy with
-- a status-aware one (mirrors how Interest Track lessons already work).
-- ---------------------------------------------------------------------------
drop policy "read formal lessons" on public.lessons;

create policy "read approved formal lessons" on public.lessons
  for select using (topic_id is not null and status = 'approved');

create policy "read own submitted formal lessons" on public.lessons
  for select using (topic_id is not null and auth.uid() = submitted_by);

-- ---------------------------------------------------------------------------
-- Teachers may submit a Formal Track lesson only into a topic whose subject
-- they've been assigned to.
-- ---------------------------------------------------------------------------
create policy "teachers insert assigned formal lessons" on public.lessons
  for insert with check (
    topic_id is not null
    and auth.uid() = submitted_by
    and status = 'pending'
    and exists (
      select 1
      from public.topics t
      join public.teacher_assignments ta on ta.subject_id = t.subject_id
      where t.id = lessons.topic_id and ta.teacher_id = auth.uid()
    )
  );

create policy "owner update own formal lessons" on public.lessons
  for update using (topic_id is not null and auth.uid() = submitted_by);

create policy "owner delete own formal lessons" on public.lessons
  for delete using (topic_id is not null and auth.uid() = submitted_by);

-- ---------------------------------------------------------------------------
-- Broaden teacher edit/delete rights on their OWN Interest Track courses and
-- lessons to any status (previously limited to 'pending' only, which meant
-- a teacher lost all control the moment a course was approved). The app
-- layer resets an approved course back to 'pending' when the teacher edits
-- it, so public visitors never see a live, unreviewed edit.
-- ---------------------------------------------------------------------------
drop policy "owner update own pending course" on public.courses;
drop policy "owner delete own pending course" on public.courses;
drop policy "owner update own pending course lessons" on public.lessons;
drop policy "owner delete own pending course lessons" on public.lessons;

create policy "owner update own course" on public.courses
  for update using (auth.uid() = submitted_by);

create policy "owner delete own course" on public.courses
  for delete using (auth.uid() = submitted_by);

create policy "owner update own course lessons" on public.lessons
  for update using (
    course_id is not null
    and exists (select 1 from public.courses c where c.id = lessons.course_id and c.submitted_by = auth.uid())
  );

create policy "owner delete own course lessons" on public.lessons
  for delete using (
    course_id is not null
    and exists (select 1 from public.courses c where c.id = lessons.course_id and c.submitted_by = auth.uid())
  );

create policy "owner insert own course lessons anytime" on public.lessons
  for insert with check (
    course_id is not null
    and exists (select 1 from public.courses c where c.id = lessons.course_id and c.submitted_by = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Admin can update/delete ANY lesson or course (moderation, cleanup),
-- in addition to the existing "admin update any course" from 0004.
-- ---------------------------------------------------------------------------
create policy "admin update any lesson" on public.lessons
  for update using (public.is_admin(auth.uid()));

create policy "admin delete any lesson" on public.lessons
  for delete using (public.is_admin(auth.uid()));

create policy "admin delete any course" on public.courses
  for delete using (public.is_admin(auth.uid()));
