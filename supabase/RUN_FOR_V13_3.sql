-- ============================================================
-- RUN_FOR_V13_3.sql — Simplexer v13.3 database step (migration 0023)
-- Run this ONCE in the Supabase SQL editor.
-- Safe before or after deploying the v13.3 code: 0023 only adds one
-- locked table and replaces the two prize functions (same signatures).
-- If check-setup.sql already shows both 0023 rows as true, skip this.
-- ============================================================

-- 0023 — Prize rebuild: the winners list always follows the ranking
--
-- Review round 2 found the prize flow still broken in three ways:
--   1. "Replace winner" re-picked the same person: the old function
--      deleted the rank's row, then chose the best attempt "not currently
--      a winner" — the student just removed qualified again, with the
--      best score. Replace only worked after a disqualify.
--   2. Disqualify (unblocked in 0022) deleted the winner's row and left
--      a hole: nobody below moved up.
--   3. Refilling a hole picked the best non-winner for that rank, so
--      4th place could jump into prize 2 while 3rd kept prize 3.
--
-- The rule from this migration on: the winners list is a pure function
-- of the ranking. After ANY removal, private.competition_rebuild_winners
-- rebuilds it — everyone below the removed student moves up one place,
-- the next eligible student enters at the bottom, and each student's
-- own phone / verified / paid / payment_ref record travels with them
-- (those facts belong to the student, not to the rank).
--
-- A student an organiser replaces (without disqualifying them) is
-- recorded in competition_removed_winners so a later rebuild cannot
-- quietly bring them back; a disqualified student stays out through
-- their attempt flag, as before.

create table if not exists public.competition_removed_winners (
  competition_id uuid not null references public.competitions (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  reason text not null default '',
  removed_at timestamptz not null default now(),
  primary key (competition_id, user_id)
);
alter table public.competition_removed_winners enable row level security;
revoke all on table public.competition_removed_winners from public, anon, authenticated;

-- Rebuild one competition's winners from its ranking. Internal helper:
-- it lives in the private schema (like sx_notify since 0022) so it can
-- only be reached through the checked public functions below.
create or replace function private.competition_rebuild_winners(p_comp uuid, p_exclude uuid default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  c public.competitions;
begin
  select * into c from public.competitions where id = p_comp;
  if c is null then return; end if;

  -- 1) Winners who are no longer in the desired set leave the list.
  delete from public.competition_winners w
   where w.competition_id = p_comp
     and not exists (
       with ranked as (
         select a.user_id,
                (row_number() over (order by a.score desc,
                                             (a.duration_seconds::numeric / greatest(a.total, 1)) asc,
                                             a.submitted_at asc))::int as rk
           from public.competition_attempts a
          where a.competition_id = p_comp
            and a.submitted_at is not null
            and not a.disqualified
            and (p_exclude is null or a.user_id <> p_exclude)
            and not exists (select 1 from public.competition_removed_winners x
                             where x.competition_id = p_comp and x.user_id = a.user_id)
       )
       select 1 from ranked r
        where r.user_id = w.user_id and r.rk <= 3
          and (case r.rk when 1 then c.prize_1 when 2 then c.prize_2 else c.prize_3 end) <> ''
     );

  -- 2) Park the movers at negative ranks, so the (competition_id, rank)
  --    primary key cannot collide while ranks are being swapped.
  update public.competition_winners w
     set rank = -w.rank
   where w.competition_id = p_comp
     and exists (
       with ranked as (
         select a.user_id,
                (row_number() over (order by a.score desc,
                                             (a.duration_seconds::numeric / greatest(a.total, 1)) asc,
                                             a.submitted_at asc))::int as rk
           from public.competition_attempts a
          where a.competition_id = p_comp
            and a.submitted_at is not null
            and not a.disqualified
            and (p_exclude is null or a.user_id <> p_exclude)
            and not exists (select 1 from public.competition_removed_winners x
                             where x.competition_id = p_comp and x.user_id = a.user_id)
       )
       select 1 from ranked r
        where r.user_id = w.user_id and r.rk <= 3 and r.rk <> w.rank
          and (case r.rk when 1 then c.prize_1 when 2 then c.prize_2 else c.prize_3 end) <> ''
     );

  -- 3) Movers take their final rank and prize. Phone, verified, paid and
  --    payment_ref stay untouched on the row — they are the student's
  --    own record, and a rank change alone must not erase a payment.
  update public.competition_winners w
     set rank = r.rk,
         prize = case r.rk when 1 then c.prize_1 when 2 then c.prize_2 else c.prize_3 end,
         name = r.name
    from (
      select a.user_id, u.name,
             (row_number() over (order by a.score desc,
                                          (a.duration_seconds::numeric / greatest(a.total, 1)) asc,
                                          a.submitted_at asc))::int as rk
        from public.competition_attempts a
        join public.users u on u.id = a.user_id
       where a.competition_id = p_comp
         and a.submitted_at is not null
         and not a.disqualified
         and (p_exclude is null or a.user_id <> p_exclude)
         and not exists (select 1 from public.competition_removed_winners x
                          where x.competition_id = p_comp and x.user_id = a.user_id)
    ) r
   where w.competition_id = p_comp and w.rank < 0 and r.user_id = w.user_id;

  -- 4) Students newly in the money are inserted (this is the only step
  --    that fires the "you won a prize" notification, via the existing
  --    trigger — rank moves in step 3 do not re-notify).
  insert into public.competition_winners (competition_id, rank, user_id, name, prize)
  select p_comp, r.rk, r.user_id, r.name,
         case r.rk when 1 then c.prize_1 when 2 then c.prize_2 else c.prize_3 end
    from (
      select a.user_id, u.name,
             (row_number() over (order by a.score desc,
                                          (a.duration_seconds::numeric / greatest(a.total, 1)) asc,
                                          a.submitted_at asc))::int as rk
        from public.competition_attempts a
        join public.users u on u.id = a.user_id
       where a.competition_id = p_comp
         and a.submitted_at is not null
         and not a.disqualified
         and (p_exclude is null or a.user_id <> p_exclude)
         and not exists (select 1 from public.competition_removed_winners x
                          where x.competition_id = p_comp and x.user_id = a.user_id)
    ) r
   where r.rk <= 3
     and (case r.rk when 1 then c.prize_1 when 2 then c.prize_2 else c.prize_3 end) <> ''
     and not exists (select 1 from public.competition_winners w
                      where w.competition_id = p_comp and w.user_id = r.user_id);
end $$;
revoke all on function private.competition_rebuild_winners(uuid, uuid) from public, anon, authenticated;

-- Replace winner: record who is being replaced (so they stay out),
-- then rebuild. Everyone below moves up one place; the next eligible
-- student enters at the last prize rank. Calling it on an empty rank
-- simply rebuilds, which also repairs holes left by older versions.
create or replace function public.competition_replace_winner(comp uuid, rnk int) returns void
language plpgsql security definer set search_path = public as $$
declare
  outgoing uuid;
begin
  if not public.can_manage_competition(comp) then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.competitions where id = comp) then raise exception 'not_found'; end if;

  select user_id into outgoing
    from public.competition_winners
   where competition_id = comp and rank = rnk;

  if outgoing is not null then
    insert into public.competition_removed_winners (competition_id, user_id, reason)
    values (comp, outgoing, 'replaced by organiser')
    on conflict (competition_id, user_id) do nothing;
  end if;

  perform private.competition_rebuild_winners(comp, outgoing);
end $$;

-- Disqualify: mark the attempt (as before), then rebuild so the prize
-- places close up behind the removed student — no hole, no queue jump.
create or replace function public.competition_disqualify(comp uuid, uid uuid, why text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_competition(comp) then raise exception 'forbidden'; end if;
  update public.competition_attempts
     set disqualified = true, dq_reason = left(coalesce(why, ''), 200)
   where competition_id = comp and user_id = uid;
  perform private.competition_rebuild_winners(comp, null);
end $$;
