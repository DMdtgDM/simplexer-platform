-- 0022 — Security review fixes (October 2026 external review).
--
-- 1. PARENT PHONE NUMBERS WERE PUBLIC. jobs.contact_phone sat on a table
--    with a "anyone reads jobs" policy, so any stranger with the public
--    key could read a family's name + phone number. The phone moves to a
--    locked table, and the column is dropped from jobs.
-- 2. NOTIFICATION PHISHING. The notify helper lived in the public schema,
--    where a real Supabase project hands out execute grants by default —
--    a signed-in user could plant a fake "security alert" with an
--    off-site link in an admin's inbox. The helper moves to a private
--    schema the API cannot reach, and the notifications table itself now
--    refuses off-site links.
-- 3. DISQUALIFY AFTER FINALIZING WAS REFUSED, so "replace winner" kept
--    re-picking the same person. Disqualify now works at any stage and
--    frees the prize place.
-- 4. GENDER PREFERENCE WAS PAGE-ONLY. The job_applications insert policy
--    now checks the job's gender preference against the tutor's profile
--    in the database itself.

-- ---------- 1. job_contacts ----------
create table if not exists public.job_contacts (
  job_id uuid primary key references public.jobs (id) on delete cascade,
  contact_phone text not null default ''
);
alter table public.job_contacts enable row level security;

drop policy if exists "poster or admin manages job contact" on public.job_contacts;
create policy "poster or admin manages job contact" on public.job_contacts
  for all
  using (exists (select 1 from public.jobs j
                  where j.id = job_id
                    and (j.poster_id = auth.uid() or public.is_admin(auth.uid()))))
  with check (exists (select 1 from public.jobs j
                       where j.id = job_id
                         and (j.poster_id = auth.uid() or public.is_admin(auth.uid()))));

drop policy if exists "matched tutor reads job contact" on public.job_contacts;
create policy "matched tutor reads job contact" on public.job_contacts
  for select
  using (exists (select 1 from public.jobs j
                  where j.id = job_id and j.tutor_id = auth.uid()));

-- Guarded copy: if an earlier (partial) run already moved the phones and
-- dropped the column, skip quietly instead of erroring — this whole file
-- must stay safe to re-run.
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'jobs'
                and column_name = 'contact_phone') then
    insert into public.job_contacts (job_id, contact_phone)
      select id, contact_phone from public.jobs where coalesce(contact_phone, '') <> ''
      on conflict (job_id) do nothing;
  end if;
end $$;

alter table public.jobs drop column if exists contact_phone;

-- One card the job page uses to connect the two sides. Returns rows only
-- to the poster, an admin, or the matched tutor — nobody else, and never
-- to logged-out visitors.
create or replace function public.job_connect_card(p_job uuid)
returns table (poster_name text, parent_phone text, tutor_name text, tutor_phone text)
language plpgsql security definer set search_path = public as $$
declare
  j public.jobs;
  v_tutor_name text;
  v_tutor_phone text;
begin
  select * into j from public.jobs where id = p_job;
  if j.id is null then return; end if;
  if not (public.is_admin(auth.uid()) or j.poster_id = auth.uid() or j.tutor_id = auth.uid()
          or exists (select 1 from public.service_requests r
                      where r.job_id = j.id and r.requester_id = auth.uid())) then
    return;
  end if;
  if j.tutor_id is not null then
    select coalesce(nullif(u.name, ''), 'Tutor'), tp.phone
      into v_tutor_name, v_tutor_phone
      from public.users u
      left join public.tutor_profiles tp on tp.user_id = u.id
     where u.id = j.tutor_id;
  end if;
  return query
    select j.poster_name,
           (select c.contact_phone from public.job_contacts c where c.job_id = j.id),
           v_tutor_name,
           v_tutor_phone;
end $$;
grant execute on function public.job_connect_card(uuid) to authenticated;

-- ---------- 2. notification helper out of the API ----------
create schema if not exists private;

create or replace function private.sx_notify(p_user uuid, p_kind text, p_title text, p_body text, p_href text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is not null then
    insert into public.notifications (user_id, kind, title, body, href)
    values (p_user, p_kind, p_title, coalesce(p_body, ''), coalesce(p_href, ''));
  end if;
end $$;
revoke all on function private.sx_notify(uuid, text, text, text, text) from public, anon, authenticated;

-- Repoint every trigger function at the private helper (bodies unchanged
-- from 0019/0021 apart from the helper's name).
create or replace function public.notify_request_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status or coalesce(new.admin_note, '') <> coalesce(old.admin_note, '') then
    perform private.sx_notify(new.requester_id, 'request', 'Your tutor request was updated',
      'Status: ' || new.status || case when coalesce(new.admin_note, '') <> '' then ' — ' || new.admin_note else '' end,
      '/requests');
  end if;
  return new;
end $$;

create or replace function public.notify_job_application() returns trigger
language plpgsql security definer set search_path = public as $$
declare j public.jobs;
begin
  select * into j from public.jobs where id = new.job_id;
  if j.id is not null then
    perform private.sx_notify(j.poster_id, 'application', 'New application for your job',
      coalesce(j.subject, 'Tutor job') || ' — open the job to review the tutor.', '/jobs/' || j.id::text);
  end if;
  return new;
end $$;

create or replace function public.notify_job_matched() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.tutor_id is not null and new.tutor_id is distinct from old.tutor_id then
    if (select coalesce(notify_jobs, true) from public.users where id = new.tutor_id) then
      perform private.sx_notify(new.tutor_id, 'job', 'You were matched to a tutoring job',
        coalesce(new.subject, 'Tutor job') || ' — open the job for the family contact details.', '/jobs/' || new.id::text);
    end if;
    for r in select requester_id from public.service_requests where job_id = new.id loop
      perform private.sx_notify(r.requester_id, 'job', 'A tutor was matched to your request',
        'The Simplexer team matched a tutor for ' || coalesce(new.subject, 'your subject') || '. They will connect you.',
        '/requests');
    end loop;
  end if;
  return new;
end $$;

create or replace function public.notify_tutor_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform private.sx_notify(new.user_id, 'tutor',
      case new.status when 'verified' then 'Your tutor profile is verified'
                      when 'rejected' then 'Your tutor profile needs changes'
                      else 'Your tutor profile status changed' end,
      case when coalesce(new.admin_note, '') <> '' then new.admin_note else 'Open your tutor profile to see the current status.' end,
      '/tutor');
  end if;
  return new;
end $$;

create or replace function public.notify_entry_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    perform private.sx_notify(new.user_id, 'competition',
      case new.status when 'approved' then 'Your competition entry was approved' else 'Your competition entry was not approved' end,
      'Open the competition to see what happens next.', '/competitions/' || new.competition_id::text);
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
    perform private.sx_notify(new.user_id, 'prize', 'You won a competition prize',
      'Rank #' || new.rank || ': ' || new.prize || '. Open the competition and send your phone number if you have not already.',
      '/competitions/' || new.competition_id::text);
  elsif new.paid and not old.paid then
    perform private.sx_notify(new.user_id, 'prize', 'Your prize has been paid',
      'Rank #' || new.rank || ': ' || new.prize || case when coalesce(new.payment_ref, '') <> '' then ' — reference: ' || new.payment_ref else '' end,
      '/competitions/' || new.competition_id::text);
  elsif new.verified and not old.verified then
    perform private.sx_notify(new.user_id, 'prize', 'Your win was verified',
      'Rank #' || new.rank || ': ' || new.prize || '. Payment is the next step.',
      '/competitions/' || new.competition_id::text);
  end if;
  return new;
end $$;

create or replace function public.notify_admins_new_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare a record;
begin
  for a in select id from public.users where role = 'admin' loop
    perform private.sx_notify(a.id, 'request', 'New tutor request',
      coalesce(new.subject, 'Tutor request') || ' — open Requests to reply or post it as a job.', '/admin/requests');
  end loop;
  return new;
end $$;

create or replace function public.notify_admins_course_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare a record;
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    for a in select id from public.users where role = 'admin' loop
      perform private.sx_notify(a.id, 'review', 'New course waiting for review',
        new.title || ' — open the review queue.', '/admin');
    end loop;
  end if;
  return new;
end $$;

create or replace function public.notify_admins_lesson_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare a record;
begin
  if new.status = 'pending' and new.topic_id is not null and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    for a in select id from public.users where role = 'admin' loop
      perform private.sx_notify(a.id, 'review', 'New lesson waiting for review',
        new.title || ' — open the review queue.', '/admin');
    end loop;
  end if;
  return new;
end $$;

drop function if exists public.sx_notify(uuid, text, text, text, text);

-- The table itself refuses off-site links, whoever writes the row.
-- (drop-if-exists first: "add constraint" has no IF NOT EXISTS in
-- Postgres, so without this a re-run dies with 42710 already exists.)
alter table public.notifications drop constraint if exists notifications_href_internal;
alter table public.notifications
  add constraint notifications_href_internal
  check (href = '' or (href like '/%' and href not like '//%' and position('\' in href) = 0)) not valid;
alter table public.notifications validate constraint notifications_href_internal;

-- ---------- 3. disqualify at any stage ----------
create or replace function public.competition_disqualify(comp uuid, uid uuid, why text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_competition(comp) then raise exception 'forbidden'; end if;
  update public.competition_attempts
     set disqualified = true, dq_reason = left(coalesce(why, ''), 200)
   where competition_id = comp and user_id = uid;
  -- Free any prize place they hold, so Replace winner can promote the
  -- next eligible student. Cheating is usually found AFTER finalizing,
  -- which is why the old "finalized" refusal broke the whole flow.
  delete from public.competition_winners
   where competition_id = comp and user_id = uid;
end $$;

-- ---------- 4. gender preference enforced by the database ----------
drop policy if exists "verified tutors and teachers apply to open jobs" on public.job_applications;
create policy "verified tutors and teachers apply to open jobs" on public.job_applications
  for insert with check (
    auth.uid() = applicant_id
    and (public.is_teacher_or_admin(auth.uid())
         or exists (select 1 from public.tutor_profiles t
                     where t.user_id = auth.uid() and t.status = 'verified'))
    and exists (
      select 1 from public.jobs j
       where j.id = job_id and j.status = 'open'
         and (coalesce(j.gender_pref, 'any') = 'any'
              or public.is_admin(auth.uid())
              or exists (select 1 from public.tutor_profiles t2
                          where t2.user_id = auth.uid() and t2.gender = j.gender_pref))
    )
  );
