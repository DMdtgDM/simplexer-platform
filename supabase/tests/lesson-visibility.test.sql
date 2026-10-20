-- Lesson visibility + owner delete tests (v13.5 / migration 0026).
-- Run on a SCRATCH database with ALL migrations applied (0001..0026):
--   psql -d scratchdb -v ON_ERROR_STOP=1 -f supabase/tests/lesson-visibility.test.sql
-- Needs the usual local stubs (auth.uid() reading request.jwt.claims,
-- anon/authenticated roles). Do NOT run on a real database.
--
-- Proves:
--   * a stranger cannot read a private lesson, nor its quiz/questions/options
--   * an enrolled student (progress in the same course/topic) can read an
--     'enrolled' lesson and its quiz, a non-enrolled student cannot
--   * the owner can read their private lesson; public lessons are unchanged
--   * probe_private_lessons_hidden() returns true
--   * a lesson's creator/course owner CAN delete their own lesson (and the
--     quiz cascades away); a non-owner's delete removes nothing

\set QUIET on
\pset pager off

-- scratch-only grants so RLS (not table privileges) is what gates rows
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ---------- fixtures (as superuser; RLS bypassed for setup) ----------
-- users: 1111.. admin, 2222.. course teacher, 3333.. enrolled student,
--        4444.. stranger student, 5555.. formal-lesson teacher
-- public.users.id references auth.users; the local stub needs the
-- metadata column the signup trigger reads (present in real Supabase).
alter table auth.users add column if not exists raw_user_meta_data jsonb;
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'admin@test.local', '{"name":"Admin"}'),
  ('22222222-2222-2222-2222-222222222222', 'teacher@test.local', '{"name":"Teacher"}'),
  ('33333333-3333-3333-3333-333333333333', 'enrolled@test.local', '{"name":"Enrolled"}'),
  ('44444444-4444-4444-4444-444444444444', 'stranger@test.local', '{"name":"Stranger"}'),
  ('55555555-5555-5555-5555-555555555555', 'formal@test.local', '{"name":"FormalTeacher"}')
on conflict (id) do nothing;
-- the signup trigger created the public.users rows; set the roles we need
update public.users set role = 'admin' where id = '11111111-1111-1111-1111-111111111111';
update public.users set role = 'teacher' where id in ('22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555');

insert into public.categories (id, name, slug) values
  ('c0000000-0000-0000-0000-000000000001', 'TestCat', 'testcat-v135')
on conflict (id) do nothing;

insert into public.courses (id, category_id, slug, title, status, submitted_by) values
  ('c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
   'test-course-v135', 'Test Course', 'approved', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

insert into public.grades (id, name, slug) values
  ('60000000-0000-0000-0000-000000000001', 'Grade T', 'grade-t-v135') on conflict (id) do nothing;
insert into public.subjects (id, grade_id, name, slug) values
  ('60000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'Subj T', 'subj-t-v135') on conflict (id) do nothing;
insert into public.topics (id, subject_id, name, slug) values
  ('60000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000002', 'Topic T', 'topic-t-v135') on conflict (id) do nothing;

-- course lessons: a000..01 public, 02 enrolled, 03 private, 04 public (progress anchor)
insert into public.lessons (id, course_id, slug, title, content, status, visibility) values
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'pub', 'Public lesson', 'x', 'approved', 'public'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'enr', 'Enrolled lesson', 'x', 'approved', 'enrolled'),
  ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'pri', 'Private lesson', 'x', 'approved', 'private'),
  ('a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'anchor', 'Anchor lesson', 'x', 'approved', 'public')
on conflict (id) do nothing;

-- formal lessons by FormalTeacher: b000..01 public anchor, 02 enrolled, 03 private
insert into public.lessons (id, topic_id, slug, title, content, status, visibility, submitted_by) values
  ('b0000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000003', 'fpub', 'Formal public', 'x', 'approved', 'public', '55555555-5555-5555-5555-555555555555'),
  ('b0000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003', 'fenr', 'Formal enrolled', 'x', 'approved', 'enrolled', '55555555-5555-5555-5555-555555555555'),
  ('b0000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000003', 'fpri', 'Formal private', 'x', 'approved', 'private', '55555555-5555-5555-5555-555555555555')
on conflict (id) do nothing;

-- a quiz on the private course lesson + the enrolled course lesson
insert into public.quizzes (id, lesson_id, title) values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Private quiz'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Enrolled quiz')
on conflict (id) do nothing;
insert into public.questions (id, quiz_id, question_text) values
  ('d0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000001', 'Secret question?'),
  ('d0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000002', 'Enrolled question?')
on conflict (id) do nothing;
insert into public.question_options (id, question_id, option_text) values
  ('d0000000-0000-0000-0000-000000000021', 'd0000000-0000-0000-0000-000000000011', 'A'),
  ('d0000000-0000-0000-0000-000000000022', 'd0000000-0000-0000-0000-000000000012', 'A')
on conflict (id) do nothing;

-- enrolled student has progress in the course (anchor lesson) and in the topic
insert into public.progress (user_id, lesson_id, completed) values
  ('33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000004', true),
  ('33333333-3333-3333-3333-333333333333', 'b0000000-0000-0000-0000-000000000001', true)
on conflict (user_id, lesson_id) do nothing;

-- ---------- helper: count visible rows as a viewer ----------
create or replace function pg_temp.see(what text, viewer uuid, lesson uuid) returns int
language plpgsql as $$
declare n int;
begin
  if viewer is null then
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', '', true);
  else
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"' || viewer::text || '"}', true);
  end if;
  if what = 'lesson' then
    select count(*) into n from public.lessons where id = lesson;
  elsif what = 'quiz' then
    select count(*) into n from public.quizzes where lesson_id = lesson;
  elsif what = 'questions' then
    select count(*) into n from public.questions q join public.quizzes z on z.id = q.quiz_id where z.lesson_id = lesson;
  elsif what = 'options' then
    select count(*) into n from public.question_options o
      join public.questions q on q.id = o.question_id
      join public.quizzes z on z.id = q.quiz_id where z.lesson_id = lesson;
  end if;
  return n;
end $$;

create or replace function pg_temp.assert_eq(name text, got int, want int) returns void
language plpgsql as $$
begin
  if got is distinct from want then
    raise exception 'FAIL %: got %, want %', name, got, want;
  end if;
  raise notice 'PASS %', name;
end $$;

-- ---------- visibility assertions ----------
begin;
select pg_temp.assert_eq('anon sees public course lesson', pg_temp.see('lesson', null, 'a0000000-0000-0000-0000-000000000001'), 1);
select pg_temp.assert_eq('anon cannot see enrolled course lesson', pg_temp.see('lesson', null, 'a0000000-0000-0000-0000-000000000002'), 0);
select pg_temp.assert_eq('anon cannot see private course lesson', pg_temp.see('lesson', null, 'a0000000-0000-0000-0000-000000000003'), 0);
select pg_temp.assert_eq('anon cannot see private lesson quiz', pg_temp.see('quiz', null, 'a0000000-0000-0000-0000-000000000003'), 0);
select pg_temp.assert_eq('anon cannot see private lesson questions', pg_temp.see('questions', null, 'a0000000-0000-0000-0000-000000000003'), 0);
select pg_temp.assert_eq('anon cannot see private lesson options', pg_temp.see('options', null, 'a0000000-0000-0000-0000-000000000003'), 0);
commit;

begin;
select pg_temp.assert_eq('stranger sees public course lesson', pg_temp.see('lesson', '44444444-4444-4444-4444-444444444444', 'a0000000-0000-0000-0000-000000000001'), 1);
select pg_temp.assert_eq('stranger cannot see enrolled course lesson', pg_temp.see('lesson', '44444444-4444-4444-4444-444444444444', 'a0000000-0000-0000-0000-000000000002'), 0);
select pg_temp.assert_eq('stranger cannot see private course lesson', pg_temp.see('lesson', '44444444-4444-4444-4444-444444444444', 'a0000000-0000-0000-0000-000000000003'), 0);
select pg_temp.assert_eq('stranger cannot see enrolled formal lesson', pg_temp.see('lesson', '44444444-4444-4444-4444-444444444444', 'b0000000-0000-0000-0000-000000000002'), 0);
commit;

begin;
select pg_temp.assert_eq('enrolled student sees enrolled course lesson', pg_temp.see('lesson', '33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000002'), 1);
select pg_temp.assert_eq('enrolled student sees enrolled lesson quiz', pg_temp.see('quiz', '33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000002'), 1);
select pg_temp.assert_eq('enrolled student sees enrolled lesson questions', pg_temp.see('questions', '33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000002'), 1);
select pg_temp.assert_eq('enrolled student still cannot see private lesson', pg_temp.see('lesson', '33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000003'), 0);
select pg_temp.assert_eq('enrolled student sees enrolled formal lesson (topic progress)', pg_temp.see('lesson', '33333333-3333-3333-3333-333333333333', 'b0000000-0000-0000-0000-000000000002'), 1);
select pg_temp.assert_eq('enrolled student cannot see private formal lesson', pg_temp.see('lesson', '33333333-3333-3333-3333-333333333333', 'b0000000-0000-0000-0000-000000000003'), 0);
commit;

begin;
select pg_temp.assert_eq('course owner sees private lesson', pg_temp.see('lesson', '22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000003'), 1);
select pg_temp.assert_eq('course owner sees private lesson quiz', pg_temp.see('quiz', '22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000003'), 1);
select pg_temp.assert_eq('formal creator sees own private formal lesson', pg_temp.see('lesson', '55555555-5555-5555-5555-555555555555', 'b0000000-0000-0000-0000-000000000003'), 1);
select pg_temp.assert_eq('other teacher cannot see private formal lesson', pg_temp.see('lesson', '22222222-2222-2222-2222-222222222222', 'b0000000-0000-0000-0000-000000000003'), 0);
select pg_temp.assert_eq('admin sees private lesson', pg_temp.see('lesson', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000003'), 1);
commit;

-- behaviour probe shipped in 0026
do $$ begin
  if not public.probe_private_lessons_hidden() then
    raise exception 'FAIL probe_private_lessons_hidden';
  end if;
  raise notice 'PASS probe_private_lessons_hidden';
end $$;

-- ---------- owner delete assertions (item 10) ----------
-- non-owner delete removes nothing
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';
delete from public.lessons where id = 'a0000000-0000-0000-0000-000000000001';
select pg_temp.assert_eq('stranger delete is a no-op (checked next txn)', 0, 0);
commit;
select pg_temp.assert_eq('lesson still exists after stranger delete',
  (select count(*)::int from public.lessons where id = 'a0000000-0000-0000-0000-000000000001'), 1);

-- another teacher cannot delete the formal teacher's lesson
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
delete from public.lessons where id = 'b0000000-0000-0000-0000-000000000001';
commit;
select pg_temp.assert_eq('formal lesson still exists after other-teacher delete',
  (select count(*)::int from public.lessons where id = 'b0000000-0000-0000-0000-000000000001'), 1);

-- course owner deletes their own private lesson; quiz + questions cascade away
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
delete from public.lessons where id = 'a0000000-0000-0000-0000-000000000003';
commit;
select pg_temp.assert_eq('owner deleted own lesson',
  (select count(*)::int from public.lessons where id = 'a0000000-0000-0000-0000-000000000003'), 0);
select pg_temp.assert_eq('quiz cascaded away with the lesson',
  (select count(*)::int from public.quizzes where id = 'd0000000-0000-0000-0000-000000000001'), 0);
select pg_temp.assert_eq('questions cascaded away with the lesson',
  (select count(*)::int from public.questions where id = 'd0000000-0000-0000-0000-000000000011'), 0);

-- formal creator deletes their own private formal lesson
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555"}';
delete from public.lessons where id = 'b0000000-0000-0000-0000-000000000003';
commit;
select pg_temp.assert_eq('formal creator deleted own lesson',
  (select count(*)::int from public.lessons where id = 'b0000000-0000-0000-0000-000000000003'), 0);

\echo 'ALL LESSON VISIBILITY + DELETE TESTS PASSED'
