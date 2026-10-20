-- Quiz visibility gate tests (v13.5.1 / migration 0027).
-- Run on a SCRATCH database with ALL migrations applied (0001..0027):
--   psql -d scratchdb -v ON_ERROR_STOP=1 -f supabase/tests/quiz-visibility-gate.test.sql
-- Needs the usual local stubs (auth.uid() reading request.jwt.claims,
-- anon/authenticated roles). Do NOT run on a real database.
--
-- Proves the external v13.5 review finding is closed:
--   * a non-owner teacher (the reviewer's attacker) canNOT grade_quiz a
--     private lesson's quiz, nor an enrolled lesson's quiz she is not a
--     member of — and no attempt/progress rows are written
--   * a pre-fix attempt on the private quiz canNOT be read back through
--     quiz_review anymore
--   * legitimate flows still work: stranger on a public quiz, enrolled
--     student on the enrolled quiz (grade + review with answers), the
--     owner and an admin on the private quiz
--   * the 0026 probe is no longer executable by anon/authenticated

\set QUIET on
\pset pager off

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ---------- fixtures ----------
alter table auth.users add column if not exists raw_user_meta_data jsonb;
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'admin@test.local', '{"name":"Admin"}'),
  ('22222222-2222-2222-2222-222222222222', 'teacher@test.local', '{"name":"Teacher"}'),
  ('33333333-3333-3333-3333-333333333333', 'enrolled@test.local', '{"name":"Enrolled"}'),
  ('44444444-4444-4444-4444-444444444444', 'stranger@test.local', '{"name":"Stranger"}'),
  ('66666666-6666-6666-6666-666666666666', 'attacker@test.local', '{"name":"AttackerTeacher"}')
on conflict (id) do nothing;
update public.users set role = 'admin' where id = '11111111-1111-1111-1111-111111111111';
update public.users set role = 'teacher' where id in ('22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666');

insert into public.categories (id, name, slug) values
  ('c0000000-0000-0000-0000-0000000000a1', 'GateCat', 'gatecat-v1351')
on conflict (id) do nothing;
insert into public.courses (id, category_id, slug, title, status, submitted_by) values
  ('c0000000-0000-0000-0000-0000000000a2', 'c0000000-0000-0000-0000-0000000000a1',
   'gate-course', 'Gate Course', 'approved', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

-- lessons: e..01 public anchor, e..02 enrolled, e..03 private, e..04 public with quiz
insert into public.lessons (id, course_id, slug, title, content, status, visibility) values
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000a2', 'g-anchor', 'Anchor', 'x', 'approved', 'public'),
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-0000000000a2', 'g-enr', 'Enrolled', 'x', 'approved', 'enrolled'),
  ('e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-0000000000a2', 'g-pri', 'Private', 'x', 'approved', 'private'),
  ('e0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-0000000000a2', 'g-pub', 'Public quiz lesson', 'x', 'approved', 'public')
on conflict (id) do nothing;

-- one quiz per gated lesson: f..01 enrolled, f..02 private, f..03 public
insert into public.quizzes (id, lesson_id, title) values
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'Enrolled quiz'),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', 'Private quiz'),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000004', 'Public quiz')
on conflict (id) do nothing;
insert into public.questions (id, quiz_id, question_text, question_type) values
  ('f0000000-0000-0000-0000-000000000011', 'f0000000-0000-0000-0000-000000000001', 'Enrolled secret?', 'multiple_choice'),
  ('f0000000-0000-0000-0000-000000000012', 'f0000000-0000-0000-0000-000000000002', 'Private secret?', 'multiple_choice'),
  ('f0000000-0000-0000-0000-000000000013', 'f0000000-0000-0000-0000-000000000003', 'Public question?', 'multiple_choice')
on conflict (id) do nothing;
insert into public.question_options (id, question_id, option_text, "order") values
  ('f0000000-0000-0000-0000-000000000021', 'f0000000-0000-0000-0000-000000000011', 'wrong', 1),
  ('f0000000-0000-0000-0000-000000000022', 'f0000000-0000-0000-0000-000000000011', 'right', 2),
  ('f0000000-0000-0000-0000-000000000023', 'f0000000-0000-0000-0000-000000000012', 'wrong', 1),
  ('f0000000-0000-0000-0000-000000000024', 'f0000000-0000-0000-0000-000000000012', 'right', 2),
  ('f0000000-0000-0000-0000-000000000025', 'f0000000-0000-0000-0000-000000000013', 'wrong', 1),
  ('f0000000-0000-0000-0000-000000000026', 'f0000000-0000-0000-0000-000000000013', 'right', 2)
on conflict (id) do nothing;
insert into public.question_answers (question_id, correct_option_id) values
  ('f0000000-0000-0000-0000-000000000011', 'f0000000-0000-0000-0000-000000000022'),
  ('f0000000-0000-0000-0000-000000000012', 'f0000000-0000-0000-0000-000000000024'),
  ('f0000000-0000-0000-0000-000000000013', 'f0000000-0000-0000-0000-000000000026')
on conflict (question_id) do nothing;

-- enrolled student is a course member (progress on the anchor lesson)
insert into public.progress (user_id, lesson_id, completed) values
  ('33333333-3333-3333-3333-333333333333', 'e0000000-0000-0000-0000-000000000001', true)
on conflict (user_id, lesson_id) do nothing;

-- a "pre-fix" attempt by the attacker on the private quiz (as if created
-- before 0027 landed) — its review must now be refused
insert into public.quiz_attempts (id, user_id, quiz_id, score, total, answers) values
  ('f0000000-0000-0000-0000-0000000000aa', '66666666-6666-6666-6666-666666666666',
   'f0000000-0000-0000-0000-000000000002', 1, 1, '{}'::jsonb)
on conflict (id) do nothing;

-- ---------- helpers ----------
create or replace function pg_temp.assert_eq(name text, got text, want text) returns void
language plpgsql as $$
begin
  if got is distinct from want then
    raise exception 'FAIL %: got %, want %', name, got, want;
  end if;
  raise notice 'PASS %', name;
end $$;

-- try grade_quiz as a viewer; returns 'ok' or the error message
create or replace function pg_temp.try_grade(viewer uuid, quiz uuid, answers jsonb) returns text
language plpgsql as $$
declare att uuid;
begin
  if viewer is null then
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', '', true);
  else
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"' || viewer::text || '"}', true);
  end if;
  att := public.grade_quiz(quiz, answers);
  return 'ok';
exception when others then
  return sqlerrm;
end $$;

-- try quiz_review as a viewer; returns 'ok' or the error message
create or replace function pg_temp.try_review(viewer uuid, attempt uuid) returns text
language plpgsql as $$
declare r jsonb;
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', '{"sub":"' || viewer::text || '"}', true);
  r := public.quiz_review(attempt);
  return 'ok';
exception when others then
  return sqlerrm;
end $$;

-- correct answers for each quiz, as grade payloads
-- ---------- the attack (reviewer's scenario) ----------
begin;
select pg_temp.assert_eq('attacker (other teacher) blocked from private quiz',
  pg_temp.try_grade('66666666-6666-6666-6666-666666666666', 'f0000000-0000-0000-0000-000000000002',
    '{"f0000000-0000-0000-0000-000000000012":"f0000000-0000-0000-0000-000000000024"}'::jsonb),
  'lesson_not_accessible');
select pg_temp.assert_eq('attacker blocked from enrolled quiz (not a member)',
  pg_temp.try_grade('66666666-6666-6666-6666-666666666666', 'f0000000-0000-0000-0000-000000000001',
    '{"f0000000-0000-0000-0000-000000000011":"f0000000-0000-0000-0000-000000000022"}'::jsonb),
  'lesson_not_accessible');
select pg_temp.assert_eq('stranger blocked from private quiz',
  pg_temp.try_grade('44444444-4444-4444-4444-444444444444', 'f0000000-0000-0000-0000-000000000002',
    '{"f0000000-0000-0000-0000-000000000012":"f0000000-0000-0000-0000-000000000024"}'::jsonb),
  'lesson_not_accessible');
select pg_temp.assert_eq('stranger blocked from enrolled quiz',
  pg_temp.try_grade('44444444-4444-4444-4444-444444444444', 'f0000000-0000-0000-0000-000000000001',
    '{"f0000000-0000-0000-0000-000000000011":"f0000000-0000-0000-0000-000000000022"}'::jsonb),
  'lesson_not_accessible');
select pg_temp.assert_eq('attacker review of pre-fix attempt on private quiz refused',
  pg_temp.try_review('66666666-6666-6666-6666-666666666666', 'f0000000-0000-0000-0000-0000000000aa'),
  'forbidden');
commit;

-- nothing was written by the blocked attempts
select pg_temp.assert_eq('no attempt rows written for attacker/stranger on gated quizzes',
  (select count(*)::text from public.quiz_attempts
   where quiz_id in ('f0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002')
     and user_id in ('44444444-4444-4444-4444-444444444444')), '0');
select pg_temp.assert_eq('no progress written on private lesson by blocked grading',
  (select count(*)::text from public.progress
   where lesson_id = 'e0000000-0000-0000-0000-000000000003'
     and user_id in ('44444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666666')), '0');

-- ---------- legitimate flows still work ----------
begin;
select pg_temp.assert_eq('stranger can grade the public quiz',
  pg_temp.try_grade('44444444-4444-4444-4444-444444444444', 'f0000000-0000-0000-0000-000000000003',
    '{"f0000000-0000-0000-0000-000000000013":"f0000000-0000-0000-0000-000000000026"}'::jsonb), 'ok');
select pg_temp.assert_eq('enrolled student can grade the enrolled quiz',
  pg_temp.try_grade('33333333-3333-3333-3333-333333333333', 'f0000000-0000-0000-0000-000000000001',
    '{"f0000000-0000-0000-0000-000000000011":"f0000000-0000-0000-0000-000000000022"}'::jsonb), 'ok');
select pg_temp.assert_eq('owner can grade own private quiz',
  pg_temp.try_grade('22222222-2222-2222-2222-222222222222', 'f0000000-0000-0000-0000-000000000002',
    '{"f0000000-0000-0000-0000-000000000012":"f0000000-0000-0000-0000-000000000024"}'::jsonb), 'ok');
select pg_temp.assert_eq('admin can grade the private quiz',
  pg_temp.try_grade('11111111-1111-1111-1111-111111111111', 'f0000000-0000-0000-0000-000000000002',
    '{"f0000000-0000-0000-0000-000000000012":"f0000000-0000-0000-0000-000000000024"}'::jsonb), 'ok');
commit;

-- the enrolled student can read their review (with answers) afterwards
select pg_temp.assert_eq('enrolled student review of own attempt works',
  pg_temp.try_review('33333333-3333-3333-3333-333333333333',
    (select id from public.quiz_attempts where user_id = '33333333-3333-3333-3333-333333333333'
       and quiz_id = 'f0000000-0000-0000-0000-000000000001' limit 1)), 'ok');

-- ---------- probe locked down ----------
select pg_temp.assert_eq('anon cannot execute the probe anymore',
  has_function_privilege('anon', 'public.probe_private_lessons_hidden()', 'execute')::text, 'false');
select pg_temp.assert_eq('authenticated cannot execute the probe anymore',
  has_function_privilege('authenticated', 'public.probe_private_lessons_hidden()', 'execute')::text, 'false');
do $$ begin
  if not public.probe_private_lessons_hidden() then
    raise exception 'FAIL probe still works for the SQL editor (postgres)';
  end if;
  raise notice 'PASS probe still works for the SQL editor (postgres)';
end $$;

\echo 'ALL QUIZ VISIBILITY GATE TESTS PASSED'
