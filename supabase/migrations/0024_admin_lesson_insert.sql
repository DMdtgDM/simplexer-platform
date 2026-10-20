-- 0024 — Admins can insert lessons (found live, 2026-10-18).
--
-- The lesson builder tells admins "what you save is published straight
-- away", and the 0012 status-guard trigger already lets admins insert
-- lessons as approved (it only forces TEACHERS back to 'pending').
-- But the lessons table never got an admin INSERT policy: 0006 added
-- "admin update any lesson" and "admin delete any lesson", while the
-- only INSERT policies were teacher-with-assignment (formal track) and
-- course-owner (interest track). Result: an admin pressing Publish in
-- the builder got "new row violates row-level security policy for
-- table lessons". This adds the missing policy, mirroring the existing
-- admin update/delete rules.
drop policy if exists "admin insert any lesson" on public.lessons;
create policy "admin insert any lesson" on public.lessons
  for insert with check (public.is_admin(auth.uid()));
