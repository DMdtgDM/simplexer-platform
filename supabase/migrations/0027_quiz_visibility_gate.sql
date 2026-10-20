-- 0027 — Close the quiz-function bypass of lesson visibility (v13.5.1).
--
-- Found by the external v13.5 review, confirmed in code: the SELECT policies
-- from 0026 follow the parent lesson, but grade_quiz() / quiz_review() are
-- SECURITY DEFINER functions written in 0018A, before visibility existed.
-- grade_quiz checked only that the caller was signed in, so anyone who
-- learned a private or enrolled-only lesson's quiz id could attempt it,
-- read the full review (including the correct answers) via quiz_review,
-- and even earn a "lesson completed" progress row for a lesson they
-- cannot open. This migration adds the same access rule the read policies
-- use to both functions. Nothing else changes: grading, scoring, the
-- progress write and the review payload stay exactly as in 0018A.
--
-- It also revokes the 0026 behaviour probe from anon/authenticated:
-- check-setup runs it as the postgres role in the SQL editor, which needs
-- no grant. Safe to run twice: every statement is CREATE OR REPLACE or a
-- REVOKE (revoking a grant that is not there is a no-op).

-- 1. One access predicate, kept in the private schema so it is not part
--    of the public API. Mirrors the two lessons read policies from 0026:
--    owners/admins always pass; everyone else needs an approved course
--    (or approved formal lesson) plus visibility 'public', or 'enrolled'
--    with member access. SECURITY DEFINER so it can read the lesson and
--    course rows regardless of the caller's own policies.
create or replace function private.quiz_lesson_access(lid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lid is not null
    and auth.uid() is not null
    and (
      public.owns_lesson(lid)
      or exists (
        select 1
        from public.lessons l
        where l.id = lid
          and (
            (l.course_id is not null and exists (
              select 1 from public.courses c
              where c.id = l.course_id and c.status = 'approved'
            ))
            or (l.topic_id is not null and l.status = 'approved')
          )
          and (
            l.visibility = 'public'
            or (l.visibility = 'enrolled' and public.lesson_member_access(l.id))
          )
      )
    )
$$;

-- 2. grade_quiz: identical to 0018A plus the access gate. A quiz with no
--    lesson (none exist today) keeps the old behaviour.
create or replace function public.grade_quiz(p_quiz_id uuid, p_answers jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  qz public.quizzes;
  v_score int := 0;
  v_total int := 0;
  v_attempt uuid;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into qz from public.quizzes where id = p_quiz_id;
  if qz.id is null then raise exception 'quiz_not_found'; end if;
  if qz.lesson_id is not null and not private.quiz_lesson_access(qz.lesson_id) then
    raise exception 'lesson_not_accessible';
  end if;

  select count(*) into v_total from public.questions where quiz_id = p_quiz_id;

  select count(*) into v_score
  from public.questions q
  left join public.question_answers a on a.question_id = q.id
  where q.quiz_id = p_quiz_id
    and coalesce(p_answers ->> q.id::text, '') <> ''
    and (
      case
        when coalesce(q.question_type, 'multiple_choice') = 'short_answer' then
          exists (
            select 1 from unnest(string_to_array(coalesce(a.correct_text, ''), '|')) accepted
            where lower(regexp_replace(btrim(accepted), '\s+', ' ', 'g'))
                = lower(regexp_replace(btrim(p_answers ->> q.id::text), '\s+', ' ', 'g'))
          )
        else a.correct_option_id is not null
             and a.correct_option_id::text = (p_answers ->> q.id::text)
      end
    );

  insert into public.quiz_attempts (user_id, quiz_id, score, total, answers)
  values (uid, p_quiz_id, v_score, v_total, coalesce(p_answers, '{}'::jsonb))
  returning id into v_attempt;

  if qz.lesson_id is not null then
    insert into public.progress (user_id, lesson_id, completed, completed_at)
    values (uid, qz.lesson_id, true, now())
    on conflict (user_id, lesson_id) do update set completed = true, completed_at = now();
  end if;

  insert into public.daily_activity (user_id, activity_date)
  values (uid, current_date)
  on conflict (user_id, activity_date) do nothing;

  return v_attempt;
end $$;

-- 3. quiz_review: identical to 0018A plus the same gate, so attempts
--    created before this fix cannot be used to read a now-private
--    lesson's questions and answers either.
create or replace function public.quiz_review(p_attempt_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  att public.quiz_attempts;
  qz public.quizzes;
  result jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into att from public.quiz_attempts where id = p_attempt_id;
  if att.id is null then return null; end if;
  if att.user_id <> auth.uid() then raise exception 'forbidden'; end if;
  select * into qz from public.quizzes where id = att.quiz_id;
  if qz.lesson_id is not null and not private.quiz_lesson_access(qz.lesson_id) then
    raise exception 'forbidden';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'quiz_id', q.quiz_id,
      'question_text', q.question_text,
      'explanation', q.explanation,
      'order', q."order",
      'question_type', coalesce(q.question_type, 'multiple_choice'),
      'correct_text', a.correct_text,
      'question_options', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'id', o.id,
            'question_id', o.question_id,
            'option_text', o.option_text,
            'is_correct', a.correct_option_id = o.id,
            'order', o."order"
          ) order by o."order"), '[]'::jsonb)
        from public.question_options o where o.question_id = q.id
      )
    ) order by q."order"), '[]'::jsonb)
  into result
  from public.questions q
  left join public.question_answers a on a.question_id = q.id
  where q.quiz_id = att.quiz_id;

  return result;
end $$;

grant execute on function public.grade_quiz(uuid, jsonb) to authenticated;
grant execute on function public.quiz_review(uuid) to authenticated;

-- 4. The 0026 behaviour probe is a check-setup tool for the SQL editor
--    (postgres role). Nobody needs to call it through the API.
revoke execute on function public.probe_private_lessons_hidden() from anon, authenticated, public;
