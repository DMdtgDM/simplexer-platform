-- 0018A — Lock the lesson-quiz answer key, step 1 of 2 (SAFE to run before deploying v12).
--
-- Why: question_options.is_correct and questions.correct_text are currently readable
-- by anyone holding the public anon key. This step creates a locked answers table,
-- copies every existing answer into it, and adds database-side grading/review.
-- Nothing is removed here, so the currently deployed site keeps working.
-- Run 0018B only AFTER the v12 code is deployed.

create table if not exists public.question_answers (
  question_id uuid primary key references public.questions (id) on delete cascade,
  correct_option_id uuid references public.question_options (id) on delete set null,
  correct_text text
);

alter table public.question_answers enable row level security;

-- Only the lesson's owner (its teacher) or an admin may see or change an answer.
drop policy if exists "owners manage question answers" on public.question_answers;
create policy "owners manage question answers" on public.question_answers
  for all
  using (
    exists (
      select 1 from public.questions s
      join public.quizzes q on q.id = s.quiz_id
      where s.id = question_id and public.owns_lesson(q.lesson_id)
    )
  )
  with check (
    exists (
      select 1 from public.questions s
      join public.quizzes q on q.id = s.quiz_id
      where s.id = question_id and public.owns_lesson(q.lesson_id)
    )
  );

-- Copy the answers that exist today (first correct option wins, in option order).
insert into public.question_answers (question_id, correct_option_id, correct_text)
select q.id,
       (select o.id from public.question_options o
         where o.question_id = q.id and o.is_correct
         order by o."order" limit 1),
       q.correct_text
from public.questions q
on conflict (question_id) do update
  set correct_option_id = coalesce(public.question_answers.correct_option_id, excluded.correct_option_id),
      correct_text = coalesce(public.question_answers.correct_text, excluded.correct_text);

-- Grade a quiz inside the database. Students send answers; they never receive the key.
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

-- Review is available only to the student who owns the attempt, after submitting it.
create or replace function public.quiz_review(p_attempt_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  att public.quiz_attempts;
  result jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into att from public.quiz_attempts where id = p_attempt_id;
  if att.id is null then return null; end if;
  if att.user_id <> auth.uid() then raise exception 'forbidden'; end if;

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
