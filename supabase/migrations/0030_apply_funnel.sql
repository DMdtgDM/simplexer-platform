-- 0030_apply_funnel.sql
-- Apply funnel: jobs are visible to everyone, and any signed-in visitor can
-- press Apply. Someone who is not yet a verified tutor is sent to the tutor
-- application first; the job they clicked is remembered on their tutor
-- profile (interested_job_id). The moment an admin verifies them, this
-- trigger sends them a notification that links straight back to that job,
-- so the application they wanted to make is one tap away.
--
-- Nothing here weakens the apply gate: job_applications still only accepts
-- verified tutors and teachers (see 0022). This only remembers intent.

alter table public.tutor_profiles
  add column if not exists interested_job_id uuid references public.jobs(id) on delete set null;

create or replace function public.notify_verified_job_return() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  j record;
begin
  if new.status = 'verified'
     and old.status is distinct from 'verified'
     and new.interested_job_id is not null then
    select subject, status into j from public.jobs where id = new.interested_job_id;
    if found and j.status = 'open' then
      perform public.sx_notify(new.user_id, 'job',
        'You are verified — apply now',
        'Tap to open "' || j.subject || '" and send your application.',
        '/jobs/' || new.interested_job_id);
    end if;
    -- Clear the remembered job so it is used once. This update re-fires the
    -- trigger, but with interested_job_id null the condition above is false,
    -- so it stops there.
    update public.tutor_profiles
       set interested_job_id = null
     where user_id = new.user_id;
  end if;
  return new;
end $$;

drop trigger if exists notify_verified_job_return on public.tutor_profiles;
create trigger notify_verified_job_return after update on public.tutor_profiles
  for each row execute function public.notify_verified_job_return();
