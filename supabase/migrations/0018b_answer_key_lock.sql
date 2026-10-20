-- 0018B — Lock the lesson-quiz answer key, step 2 of 2.
--
-- RUN ONLY AFTER: (1) 0018A has run successfully, and (2) the v12 code is deployed.
-- The v12 code grades through grade_quiz() and reads teacher answers from
-- question_answers, so the public copies can now be removed.
-- This file refuses to run if any existing answer failed to copy across.

do $$
begin
  if exists (
    select 1 from public.questions q
    where coalesce(q.question_type, 'multiple_choice') <> 'short_answer'
      and exists (select 1 from public.question_options o where o.question_id = q.id and o.is_correct)
      and not exists (
        select 1 from public.question_answers a
        where a.question_id = q.id and a.correct_option_id is not null
      )
  ) then
    raise exception 'Answer copy is incomplete for one or more choice questions. Do not drop the old columns.';
  end if;

  if exists (
    select 1 from public.questions q
    where coalesce(q.question_type, 'multiple_choice') = 'short_answer'
      and coalesce(q.correct_text, '') <> ''
      and not exists (
        select 1 from public.question_answers a
        where a.question_id = q.id and coalesce(a.correct_text, '') <> ''
      )
  ) then
    raise exception 'Answer copy is incomplete for one or more short-answer questions. Do not drop the old columns.';
  end if;
end $$;

alter table public.question_options drop column if exists is_correct;
alter table public.questions drop column if exists correct_text;
