-- SIMPLEXER v13: run this ONE file in the Supabase SQL editor, then deploy the v13 code.
-- Order note: if you have NOT deployed v12 yet, first do the v12 steps
-- (RUN_BEFORE_V12.sql -> deploy v12 -> RUN_AFTER_V12.sql). This file builds on v12's
-- notifications table. If v12 is already fully deployed, just run this file.

-- ============================================================ 0021_notes_round2
-- 0021 — Daniel's notebook, round 2 (2026-10-15).
-- 1) Course-only competitions: a competition may belong to one course; only
--    students who finished MORE THAN 50% of that course can enter it.
-- 2) Admin notifications for new requests and review-queue items.
-- 3) Profile extras: Telegram username + notification preferences.

alter table public.competitions
  add column if not exists course_id uuid references public.courses (id) on delete set null;
create index if not exists competitions_course_idx on public.competitions (course_id);

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check
  check (kind in ('request', 'job', 'application', 'tutor', 'competition', 'prize', 'review', 'system'));

alter table public.users
  add column if not exists telegram_username text,
  add column if not exists notify_jobs boolean not null default true,
  add column if not exists notify_competitions boolean not null default true;

-- Fraction (0..1) of a course a user has completed. Lessons of the course only.
create or replace function public.course_progress_fraction(p_user uuid, p_course uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select case when total.n = 0 then 0
              else done.n::numeric / total.n end
  from (select count(*) n from public.lessons where course_id = p_course) total
  cross join (select count(*) n from public.progress pr
              join public.lessons l on l.id = pr.lesson_id
              where l.course_id = p_course and pr.user_id = p_user and pr.completed) done
$$;

-- May the current user enter this competition? General competitions: yes.
-- Course competitions: only after finishing more than half the course.
-- Creators and admins always may (they manage it).
create or replace function public.competition_course_eligible(comp uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.competitions c
    where c.id = comp
      and (c.course_id is null
           or c.created_by = auth.uid()
           or public.is_admin(auth.uid())
           or public.course_progress_fraction(auth.uid(), c.course_id) > 0.5)
  )
$$;
grant execute on function public.competition_course_eligible(uuid) to anon, authenticated;
grant execute on function public.course_progress_fraction(uuid, uuid) to authenticated;

-- Respect the new notification preferences in the two loudest triggers.
create or replace function public.notify_job_matched() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.tutor_id is not null and new.tutor_id is distinct from old.tutor_id then
    if (select coalesce(notify_jobs, true) from public.users where id = new.tutor_id) then
      perform public.sx_notify(new.tutor_id, 'job', 'You were matched to a tutoring job',
        coalesce(new.subject, 'Tutor job') || ' — open the job for the family contact details.', '/jobs/' || new.id::text);
    end if;
    for r in select requester_id from public.service_requests where job_id = new.id loop
      perform public.sx_notify(r.requester_id, 'job', 'A tutor was matched to your request',
        'The Simplexer team matched a tutor for ' || coalesce(new.subject, 'your subject') || '. They will connect you.',
        '/requests');
    end loop;
  end if;
  return new;
end $$;

create or replace function public.notify_winner_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not (select coalesce(notify_competitions, true) from public.users where id = new.user_id) then
    return new;
  end if;
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

-- Admin notifications: new parent request.
create or replace function public.notify_admins_new_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare a record;
begin
  for a in select id from public.users where role = 'admin' loop
    perform public.sx_notify(a.id, 'request', 'New tutor request',
      coalesce(new.subject, 'Tutor request') || ' — open Requests to reply or post it as a job.', '/admin/requests');
  end loop;
  return new;
end $$;
drop trigger if exists notify_admins_new_request on public.service_requests;
create trigger notify_admins_new_request after insert on public.service_requests
  for each row execute function public.notify_admins_new_request();

-- Admin notifications: a course enters the review queue.
create or replace function public.notify_admins_course_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare a record;
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    for a in select id from public.users where role = 'admin' loop
      perform public.sx_notify(a.id, 'review', 'New course waiting for review',
        new.title || ' — open the review queue.', '/admin');
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists notify_admins_course_review on public.courses;
create trigger notify_admins_course_review after insert or update on public.courses
  for each row execute function public.notify_admins_course_review();

-- Admin notifications: a school lesson enters the review queue.
create or replace function public.notify_admins_lesson_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare a record;
begin
  if new.status = 'pending' and new.topic_id is not null and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    for a in select id from public.users where role = 'admin' loop
      perform public.sx_notify(a.id, 'review', 'New lesson waiting for review',
        new.title || ' — open the review queue.', '/admin');
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists notify_admins_lesson_review on public.lessons;
create trigger notify_admins_lesson_review after insert or update on public.lessons
  for each row execute function public.notify_admins_lesson_review();

-- Users may remove their own notifications so the list does not stack up.
drop policy if exists "users delete own notifications" on public.notifications;
create policy "users delete own notifications" on public.notifications
  for delete using (user_id = auth.uid());
