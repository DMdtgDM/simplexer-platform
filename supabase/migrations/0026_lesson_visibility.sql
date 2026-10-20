-- ============================================================
-- 0026 — Lesson visibility (v13.5, Daniel's handwritten notes round 3)
--
-- A teacher choosing a lesson now picks WHO CAN SEE IT:
--   'public'   — everyone who can see lessons today (unchanged behaviour)
--   'enrolled' — students who have started the same course/topic
--                (a progress row on any lesson of it), plus the lesson
--                owner, the course owner and admins
--   'private'  — only the lesson owner, the course owner and admins
--
-- Why "enrolled" is defined through public.progress: the schema has no
-- enrolments table (audited 0001–0025). progress is the one record that
-- says "this student is in this course" — the competition eligibility
-- rule already uses it the same way (>50% of a course's lessons).
--
-- AUDIT that led here (lessons read policies before this migration):
--   * "read lessons of approved courses" (0004) — any viewer, approved course
--   * "read approved formal lessons"    (0006) — any viewer, approved topic lesson
--   * owner read policies               (0004/0006) — submitted_by / course owner
--   * "admin read all lessons"          (0004)
--   The two public policies are restated below with the visibility gate;
--   owner/admin policies are untouched, so owners and admins keep full
--   access to their own lessons of every visibility.
--   quizzes / questions / question_options still had their original 0002
--   "public read" using(true) policies — a bypass: the quiz of a private
--   lesson would stay world-readable. They are restated to follow the
--   parent lesson: a quiz is readable exactly when its lesson is.
--   (Competition questions live in competition_questions — unaffected.)
--   question_answers keeps having NO read policy for students (0018a) —
--   the answer key stays locked.
--
-- DELETE audit (item 10 — "a creator must be able to delete too"):
--   lessons already have owner delete policies (0006): the lesson's
--   submitted_by creator for formal lessons, the course owner for course
--   lessons, plus "admin delete any lesson". No policy change is needed;
--   what was missing was a visible delete action in the Teach UI, fixed
--   in app code in this release. Deleting a lesson cascades cleanly:
--   quizzes → questions → question_options / question_answers,
--   quiz_attempts, progress and bookmarks all declare ON DELETE CASCADE.
--
-- FULLY RE-RUNNABLE: every statement is guarded. Running this file twice
-- must produce no error. Deploy order: strictly AFTER 0025
-- (RUN_FOR_V13_4.sql). Never re-run an earlier RUN file after this one.
-- ============================================================

-- 1. The visibility column. Existing rows take the default 'public',
--    so nothing changes for lessons that already exist.
alter table public.lessons
  add column if not exists visibility text not null default 'public';

do $$
begin
  alter table public.lessons
    add constraint lessons_visibility_check
    check (visibility in ('public', 'enrolled', 'private'));
exception when duplicate_object then null;
end $$;

-- 2. Member-access helper. SECURITY DEFINER on purpose: the lessons
--    policies below must look at OTHER lessons of the same course/topic
--    (through progress) — a policy that queries its own table directly
--    would recurse. This function runs with definer rights and answers
--    one narrow question: does the current viewer have member access to
--    this lesson (admin, lesson owner, course owner, or enrolled)?
create or replace function public.lesson_member_access(lid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.lessons l
    left join public.courses c on c.id = l.course_id
    where l.id = lid
      and auth.uid() is not null
      and (
        public.is_admin(auth.uid())
        or l.submitted_by = auth.uid()
        or c.submitted_by = auth.uid()
        or exists (
          select 1
          from public.progress p
          join public.lessons pl on pl.id = p.lesson_id
          where p.user_id = auth.uid()
            and (
              (l.course_id is not null and pl.course_id = l.course_id)
              or (l.topic_id is not null and pl.topic_id = l.topic_id)
            )
        )
      )
  )
$$;

grant execute on function public.lesson_member_access(uuid) to anon, authenticated;

-- 3. Restate the two public lessons read policies with the visibility
--    gate. 'public' lessons behave exactly as before; 'enrolled' lessons
--    additionally need member access; 'private' lessons are not exposed
--    by these policies at all (owner/admin policies still serve them).
drop policy if exists "read lessons of approved courses" on public.lessons;
create policy "read lessons of approved courses" on public.lessons
  for select using (
    course_id is not null
    and exists (
      select 1 from public.courses c
      where c.id = lessons.course_id and c.status = 'approved'
    )
    and (
      visibility = 'public'
      or (visibility = 'enrolled' and public.lesson_member_access(lessons.id))
    )
  );

drop policy if exists "read approved formal lessons" on public.lessons;
create policy "read approved formal lessons" on public.lessons
  for select using (
    topic_id is not null
    and status = 'approved'
    and (
      visibility = 'public'
      or (visibility = 'enrolled' and public.lesson_member_access(lessons.id))
    )
  );

-- 4. Quiz chain follows the lesson. Policy subqueries run under the
--    viewer's own RLS on the parent table, so "the lesson is readable
--    by me" is inherited exactly — including the owner/admin policies.
drop policy if exists "public read quizzes" on public.quizzes;
drop policy if exists "read quizzes of visible lessons" on public.quizzes;
create policy "read quizzes of visible lessons" on public.quizzes
  for select using (
    exists (select 1 from public.lessons l where l.id = quizzes.lesson_id)
  );

drop policy if exists "public read questions" on public.questions;
drop policy if exists "read questions of visible lessons" on public.questions;
create policy "read questions of visible lessons" on public.questions
  for select using (
    exists (select 1 from public.quizzes q where q.id = questions.quiz_id)
  );

drop policy if exists "public read question_options" on public.question_options;
drop policy if exists "read options of visible lessons" on public.question_options;
create policy "read options of visible lessons" on public.question_options
  for select using (
    exists (select 1 from public.questions q where q.id = question_options.question_id)
  );

-- 5. Behaviour probe for check-setup: proves a private lesson is NOT
--    readable by an anonymous viewer, using a throwaway lesson that is
--    always cleaned up. Returns true when the private lesson is hidden.
--    The role switch is reset before returning, exception path included,
--    so callers in the same statement/transaction are unaffected.
-- NOTE: deliberately SECURITY INVOKER — Postgres forbids SET ROLE inside
-- a security-definer function. It is meant to be called by an admin (the
-- postgres role in the SQL editor / check-setup), who can switch roles.
create or replace function public.probe_private_lessons_hidden()
returns boolean
language plpgsql
set search_path = public
as $$
declare
  lid uuid;
  cid uuid;
  made boolean := false;
  n int := -1;
  ok boolean := false;
begin
  select id into lid from public.lessons where visibility = 'private' limit 1;
  if lid is null then
    select id into cid from public.courses limit 1;
    if cid is null then
      return false; -- nothing to probe with; check-setup will show false
    end if;
    insert into public.lessons (course_id, slug, title, content, visibility, status)
    values (cid, 'v135-probe-' || substr(gen_random_uuid()::text, 1, 8), 'visibility probe', '', 'private', 'approved')
    returning id into lid;
    made := true;
  end if;

  set local role anon;
  select count(*) into n from public.lessons where id = lid;
  reset role;
  ok := (n = 0);

  if made then
    delete from public.lessons where id = lid;
  end if;
  return ok;
exception when others then
  reset role;
  if made and lid is not null then
    delete from public.lessons where id = lid;
  end if;
  return false;
end $$;

grant execute on function public.probe_private_lessons_hidden() to anon, authenticated;
