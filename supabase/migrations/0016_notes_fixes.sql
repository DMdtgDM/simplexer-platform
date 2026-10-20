-- 0016 — Daniel's notes fixes (15 Oct 2026)
-- Jobs: parent contact phone + gender preference. Tutors: gender (for matching).
-- Questions: not only multiple choice. Winners: payment reference + verification,
-- and a promote-next function when a winner is removed/disqualified.

-- ---------------------------------------------------------------------------
-- Jobs / requests: contact phone so admin can actually reach the parent
-- ---------------------------------------------------------------------------
alter table public.jobs
  add column if not exists contact_phone text not null default '',
  add column if not exists gender_pref text not null default 'any'
    check (gender_pref in ('any', 'male', 'female'));

alter table public.service_requests
  add column if not exists contact_phone text not null default '',
  add column if not exists gender_pref text not null default 'any'
    check (gender_pref in ('any', 'male', 'female'));

-- ---------------------------------------------------------------------------
-- Tutor gender — used only to match a parent's stated preference on a job
-- ---------------------------------------------------------------------------
alter table public.tutor_profiles
  add column if not exists gender text check (gender in ('male', 'female'));

-- ---------------------------------------------------------------------------
-- Questions: multiple choice is no longer the only kind
--   multiple_choice — options, one correct (unchanged behaviour)
--   true_false      — stored as two options (True / False), one correct
--   short_answer    — no options; `correct_text` holds the accepted answer
--                     (grading compares trimmed, case-insensitive text;
--                     separate alternatives with | )
-- ---------------------------------------------------------------------------
alter table public.questions
  add column if not exists question_type text not null default 'multiple_choice'
    check (question_type in ('multiple_choice', 'true_false', 'short_answer')),
  add column if not exists correct_text text;

-- A pass mark nobody can reach (or below zero) is a data bug, not a setting.
do $$ begin
  alter table public.quizzes
    add constraint quizzes_pass_threshold_range check (pass_threshold between 0 and 100);
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Winners: record HOW a prize was paid, and require verification first.
-- "Verified" = an admin/manager confirmed this winner is a real student of
-- the platform (account + phone checked), per Daniel's note — not just a
-- phone number typed into a form.
-- ---------------------------------------------------------------------------
alter table public.competition_winners
  add column if not exists payment_ref text not null default '',
  add column if not exists verified boolean not null default false;

-- Replace the winner at rank `rnk` with the next eligible student:
-- highest score, then fastest time, then earliest submission; disqualified
-- attempts and students who already hold another rank are skipped, so the
-- prize moves down the ranking exactly once per call.
create or replace function public.competition_replace_winner(comp uuid, rnk int) returns void
language plpgsql security definer set search_path = public as $$
declare
  c public.competitions;
  cand record;
begin
  if not public.can_manage_competition(comp) then raise exception 'forbidden'; end if;
  select * into c from public.competitions where id = comp;
  if c is null then raise exception 'not_found'; end if;

  delete from public.competition_winners where competition_id = comp and rank = rnk;

  select a.user_id, u.name
    into cand
    from public.competition_attempts a
    join public.users u on u.id = a.user_id
   where a.competition_id = comp
     and a.submitted_at is not null
     and not a.disqualified
     and a.user_id not in (select user_id from public.competition_winners where competition_id = comp)
   order by a.score desc, a.duration_seconds asc, a.submitted_at asc
   limit 1;

  if cand is not null then
    insert into public.competition_winners (competition_id, rank, user_id, name, prize)
    values (comp, rnk, cand.user_id, cand.name,
            case rnk when 1 then c.prize_1 when 2 then c.prize_2 else c.prize_3 end);
  end if;
end $$;

grant execute on function public.competition_replace_winner(uuid, int) to authenticated;
