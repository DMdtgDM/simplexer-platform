-- SIMPLEXER v12 — STEP 1 of 2. Run this in the Supabase SQL editor BEFORE deploying the v12 code.
-- Contains 0018A (answer-key setup), 0019 (notifications), 0020 (competition delete + cleanup).
-- Safe with the current live site: nothing the old code needs is removed here.

-- ============================================================ 0018a_answer_key_setup
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


-- ============================================================ 0019_notifications
-- 0019 — In-app notifications.
-- The app used to tell nobody anything: people had to return and look.
-- These notifications are created by database triggers, so they fire no
-- matter which screen or function caused the change.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('request', 'job', 'application', 'tutor', 'competition', 'prize', 'system')),
  title text not null,
  body text not null default '',
  href text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where not is_read;

alter table public.notifications enable row level security;
drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications
  for select using (user_id = auth.uid());
drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- No insert/delete policy for normal users: only the trigger helper below writes rows.

create or replace function public.sx_notify(p_user uuid, p_kind text, p_title text, p_body text, p_href text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is not null then
    insert into public.notifications (user_id, kind, title, body, href)
    values (p_user, p_kind, p_title, coalesce(p_body, ''), coalesce(p_href, ''));
  end if;
end $$;
revoke execute on function public.sx_notify(uuid, text, text, text, text) from public, anon, authenticated;

-- A parent's request changes (status or the team's reply).
create or replace function public.notify_request_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status or coalesce(new.admin_note, '') <> coalesce(old.admin_note, '') then
    perform public.sx_notify(new.requester_id, 'request', 'Your tutor request was updated',
      'Status: ' || new.status || case when coalesce(new.admin_note, '') <> '' then ' — ' || new.admin_note else '' end,
      '/requests');
  end if;
  return new;
end $$;
drop trigger if exists notify_request_change on public.service_requests;
create trigger notify_request_change after update on public.service_requests
  for each row execute function public.notify_request_change();

-- A tutor applies: tell the job's poster (the admin who posted it).
create or replace function public.notify_job_application() returns trigger
language plpgsql security definer set search_path = public as $$
declare j public.jobs;
begin
  select * into j from public.jobs where id = new.job_id;
  if j.id is not null then
    perform public.sx_notify(j.poster_id, 'application', 'New application for your job',
      coalesce(j.subject, 'Tutor job') || ' — open the job to review the tutor.', '/jobs/' || j.id::text);
  end if;
  return new;
end $$;
drop trigger if exists notify_job_application on public.job_applications;
create trigger notify_job_application after insert on public.job_applications
  for each row execute function public.notify_job_application();

-- A tutor is accepted: tell the tutor, and tell the family behind any linked request.
create or replace function public.notify_job_matched() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.tutor_id is not null and new.tutor_id is distinct from old.tutor_id then
    perform public.sx_notify(new.tutor_id, 'job', 'You were matched to a tutoring job',
      coalesce(new.subject, 'Tutor job') || ' — open the job for the family contact details.', '/jobs/' || new.id::text);
    for r in select requester_id from public.service_requests where job_id = new.id loop
      perform public.sx_notify(r.requester_id, 'job', 'A tutor was matched to your request',
        'The Simplexer team matched a tutor for ' || coalesce(new.subject, 'your subject') || '. They will connect you.',
        '/requests');
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists notify_job_matched on public.jobs;
create trigger notify_job_matched after update on public.jobs
  for each row execute function public.notify_job_matched();

-- A tutor profile is verified / sent back / rejected.
create or replace function public.notify_tutor_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform public.sx_notify(new.user_id, 'tutor',
      case new.status when 'verified' then 'Your tutor profile is verified'
                      when 'rejected' then 'Your tutor profile needs changes'
                      else 'Your tutor profile status changed' end,
      case when coalesce(new.admin_note, '') <> '' then new.admin_note else 'Open your tutor profile to see the current status.' end,
      '/tutor');
  end if;
  return new;
end $$;
drop trigger if exists notify_tutor_review on public.tutor_profiles;
create trigger notify_tutor_review after update on public.tutor_profiles
  for each row execute function public.notify_tutor_review();

-- Competition entry approved or rejected.
create or replace function public.notify_entry_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    perform public.sx_notify(new.user_id, 'competition',
      case new.status when 'approved' then 'Your competition entry was approved' else 'Your competition entry was not approved' end,
      'Open the competition to see what happens next.', '/competitions/' || new.competition_id::text);
  end if;
  return new;
end $$;
drop trigger if exists notify_entry_status on public.competition_entries;
create trigger notify_entry_status after update on public.competition_entries
  for each row execute function public.notify_entry_status();

-- Winners: announced, verified and paid are three different moments.
create or replace function public.notify_winner_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.sx_notify(new.user_id, 'prize', 'You won a competition prize',
      'Rank #' || new.rank || ': ' || new.prize || '. Open the competition and send your phone number if you have not already.',
      '/competitions/' || new.competition_id::text);
  elsif new.paid and not old.paid then
    perform public.sx_notify(new.user_id, 'prize', 'Your prize has been paid',
      'Rank #' || new.rank || ': ' || new.prize || case when coalesce(new.payment_ref, '') <> '' then ' — reference: ' || new.payment_ref else '' end,
      '/competitions/' || new.competition_id::text);
  elsif new.verified and not old.verified then
    perform public.sx_notify(new.user_id, 'prize', 'Your win was verified',
      'Rank #' || new.rank || ': ' || new.prize || '. Payment is the next step.',
      '/competitions/' || new.competition_id::text);
  end if;
  return new;
end $$;
drop trigger if exists notify_winner_change on public.competition_winners;
create trigger notify_winner_change after insert or update on public.competition_winners
  for each row execute function public.notify_winner_change();


-- ============================================================ 0020_competition_delete_and_cleanup
-- 0020 — Competition deletion that actually deletes + legacy cleanup.
--
-- The bug Daniel hit: migration 0012 limited DELETE to competitions whose
-- status is not 'finalized', while the manage page (v11) showed the delete
-- button for every stage. The click silently matched zero rows. Managers
-- (creator or admin) may delete a competition at ANY stage; related rows
-- cascade (questions, entries, attempts, winners, secrets).

drop policy if exists "managers delete unfinished competitions" on public.competitions;
drop policy if exists "managers delete competitions" on public.competitions;
create policy "managers delete competitions" on public.competitions
  for delete using (public.can_manage_competition(id));

-- Legacy columns from the first competition design (0008). Nothing in the
-- current app reads competitions.prize or competitions.quiz_id: prizes live
-- in prize_1/prize_2/prize_3 and each competition owns its questions.
-- Preserve any stray legacy prize text before dropping the column.
update public.competitions
   set prize_1 = prize
 where coalesce(prize_1, '') = '' and coalesce(prize, '') <> '';

alter table public.competitions drop column if exists prize;
alter table public.competitions drop column if exists quiz_id;
