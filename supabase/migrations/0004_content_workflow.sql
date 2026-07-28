-- ============================================================================
-- Content workflow: roles + teacher-submitted course review queue.
--
-- Adds:
--   * users.role — 'student' | 'teacher' | 'admin' (admin promotes manually)
--   * courses.status / submitted_by / rejection_reason — Interest Track
--     courses can now be submitted by a teacher as 'pending', and only
--     become publicly visible once an admin sets them to 'approved'.
--   * Updated RLS so pending/rejected courses (and their lessons) are only
--     visible to the submitting teacher and admins — everyone else only
--     ever sees 'approved' rows, enforced at the database level.
--
-- NOTE: Formal Track content (grades/subjects/topics/lessons under a topic)
-- is intentionally left admin-only/SQL-managed — this workflow only applies
-- to Interest Track `courses` and their lessons, per the Phase 1.5 scope.
-- ============================================================================

create type user_role as enum ('student', 'teacher', 'admin');

alter table public.users
  add column role user_role not null default 'student';

create type course_status as enum ('pending', 'approved', 'rejected');

alter table public.courses
  add column status course_status not null default 'approved',
  add column submitted_by uuid references public.users (id) on delete set null,
  add column rejection_reason text;

create index courses_status_idx on public.courses (status);
create index courses_submitted_by_idx on public.courses (submitted_by);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so they can read `users` regardless of
-- the caller's own RLS visibility into that table).
-- ---------------------------------------------------------------------------
create function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.users u where u.id = uid and u.role = 'admin');
$$;

create function public.is_teacher_or_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.users u where u.id = uid and u.role in ('teacher', 'admin'));
$$;

-- ---------------------------------------------------------------------------
-- Replace the old "public read courses" / "public read lessons" policies
-- with status-aware versions.
-- ---------------------------------------------------------------------------
drop policy "public read courses" on public.courses;

create policy "read approved courses" on public.courses
  for select using (status = 'approved');

create policy "read own submitted courses" on public.courses
  for select using (auth.uid() = submitted_by);

create policy "admin read all courses" on public.courses
  for select using (public.is_admin(auth.uid()));

create policy "teachers insert own pending course" on public.courses
  for insert with check (
    auth.uid() = submitted_by
    and status = 'pending'
    and public.is_teacher_or_admin(auth.uid())
  );

create policy "owner update own pending course" on public.courses
  for update using (auth.uid() = submitted_by and status = 'pending');

create policy "admin update any course" on public.courses
  for update using (public.is_admin(auth.uid()));

create policy "owner delete own pending course" on public.courses
  for delete using (auth.uid() = submitted_by and status = 'pending');

-- ---------------------------------------------------------------------------
-- Lessons: topic-based (Formal Track) lessons stay fully public as before.
-- Course-based (Interest Track) lessons now inherit their parent course's
-- visibility rules.
-- ---------------------------------------------------------------------------
drop policy "public read lessons" on public.lessons;

create policy "read formal lessons" on public.lessons
  for select using (topic_id is not null);

create policy "read lessons of approved courses" on public.lessons
  for select using (
    course_id is not null
    and exists (select 1 from public.courses c where c.id = lessons.course_id and c.status = 'approved')
  );

create policy "read own submitted course lessons" on public.lessons
  for select using (
    course_id is not null
    and exists (select 1 from public.courses c where c.id = lessons.course_id and c.submitted_by = auth.uid())
  );

create policy "admin read all lessons" on public.lessons
  for select using (public.is_admin(auth.uid()));

create policy "teachers insert lessons for own pending course" on public.lessons
  for insert with check (
    course_id is not null
    and exists (
      select 1 from public.courses c
      where c.id = lessons.course_id and c.submitted_by = auth.uid() and c.status = 'pending'
    )
  );

create policy "owner update own pending course lessons" on public.lessons
  for update using (
    course_id is not null
    and exists (
      select 1 from public.courses c
      where c.id = lessons.course_id and c.submitted_by = auth.uid() and c.status = 'pending'
    )
  );

create policy "owner delete own pending course lessons" on public.lessons
  for delete using (
    course_id is not null
    and exists (
      select 1 from public.courses c
      where c.id = lessons.course_id and c.submitted_by = auth.uid() and c.status = 'pending'
    )
  );

-- ---------------------------------------------------------------------------
-- Admins need to be able to change any user's role (for teacher promotion)
-- and read all user profiles for the admin user-management screen.
-- ---------------------------------------------------------------------------
create policy "admin read all users" on public.users
  for select using (public.is_admin(auth.uid()));

create policy "admin update any user" on public.users
  for update using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Bootstrap: promote yourself to admin manually after running this migration:
--
--   update public.users set role = 'admin' where email = 'you@example.com';
--
-- ---------------------------------------------------------------------------
