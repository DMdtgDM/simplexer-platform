-- 0025 — Money safety (review round 3): a paid winner must never vanish.
--
-- 0023 made the winners list cascade correctly, but it had no paid
-- guard: disqualifying or replacing a winner who was ALREADY PAID
-- deleted their row — paid flag, payment reference and all — while
-- the prize moved up to the next student. Proof of a real payment
-- destroyed, and a real risk of paying the same prize twice.
--
-- This migration adds three things:
-- 1. competition_winner_removals — an append-only log. Every winner
--    row that leaves the list is snapshotted here first (student,
--    rank, prize, phone, verified, paid, payment reference, who
--    removed them, why, when). Nothing in the app can edit or delete
--    log rows: the only write path is the security-definer rebuild,
--    and the only read path is a manager policy.
-- 2. A paid guard. competition_replace_winner and
--    competition_disqualify now RAISE 'winner_already_paid' instead
--    of removing a paid winner, and the rebuild itself refuses to
--    drop a paid row as a backstop. The genuine "cheating found
--    after payment" case goes through the explicit
--    competition_remove_paid_winner, which demands a written reason
--    and logs the removal loudly (reason + was_paid + reference).
-- 3. Winner messages that tell the whole story. 0023 stayed silent
--    on rank changes (anti-spam) and removals were invisible (the
--    notify trigger cannot fire on DELETE). The rebuild now sends
--    exactly one message per affected student: "your prize was
--    removed" to the student who leaves, and "your prize changed —
--    you are now rank #N" to each student whose rank moves. New
--    winners still get the existing "you won" message from the
--    insert trigger.

-- ---------- 1. the removal log ----------
create table if not exists public.competition_winner_removals (
  id bigint generated always as identity primary key,
  competition_id uuid not null references public.competitions (id) on delete cascade,
  user_id uuid not null,
  user_name text not null default '',
  rank int not null,
  prize text not null default '',
  phone text not null default '',
  was_verified boolean not null default false,
  was_paid boolean not null default false,
  paid_at timestamptz,
  payment_ref text not null default '',
  reason text not null default '',
  removed_by uuid,
  removed_by_name text not null default '',
  removed_at timestamptz not null default now()
);
alter table public.competition_winner_removals enable row level security;
revoke all on table public.competition_winner_removals from public, anon;
grant select on table public.competition_winner_removals to authenticated;
drop policy if exists "managers read winner removals" on public.competition_winner_removals;
create policy "managers read winner removals" on public.competition_winner_removals
  for select using (public.can_manage_competition(competition_id));

-- ---------- 2 + 3. rebuild v2: log, guard, notify ----------
drop function if exists private.competition_rebuild_winners(uuid, uuid);
create or replace function private.competition_rebuild_winners(
  p_comp uuid,
  p_exclude uuid default null,
  p_actor uuid default null,
  p_reason text default '',
  p_force boolean default false
) returns void
language plpgsql security definer set search_path = public as $$
declare
  c public.competitions;
  rec record;
  actor_name text := '';
begin
  select * into c from public.competitions where id = p_comp;
  if c is null then return; end if;

  if p_actor is not null then
    select coalesce(name, '') into actor_name from public.users where id = p_actor;
  end if;

  -- The desired winners, from the ranking (same rule as finalize).
  create temp table if not exists sx_desired_winners (rk int, user_id uuid, name text, prize text) on commit drop;
  truncate sx_desired_winners;
  insert into sx_desired_winners
  select rk, user_id, name,
         case rk when 1 then c.prize_1 when 2 then c.prize_2 else c.prize_3 end
    from (
      select (row_number() over (order by a.score desc,
                                          (a.duration_seconds::numeric / greatest(a.total, 1)) asc,
                                          a.submitted_at asc))::int as rk,
             a.user_id, u.name
        from public.competition_attempts a
        join public.users u on u.id = a.user_id
       where a.competition_id = p_comp
         and a.submitted_at is not null
         and not a.disqualified
         and (p_exclude is null or a.user_id <> p_exclude)
         and not exists (select 1 from public.competition_removed_winners x
                          where x.competition_id = p_comp and x.user_id = a.user_id)
    ) r
   where rk <= 3
     and (case rk when 1 then c.prize_1 when 2 then c.prize_2 else c.prize_3 end) <> '';

  -- Backstop paid guard: never drop a paid winner unless forced by the
  -- explicit paid-removal function.
  if not p_force and exists (
    select 1 from public.competition_winners w
     where w.competition_id = p_comp and w.paid
       and not exists (select 1 from sx_desired_winners d where d.user_id = w.user_id)
  ) then
    raise exception 'winner_already_paid';
  end if;

  -- Log + notify + delete the students who are leaving the list.
  for rec in
    select w.* from public.competition_winners w
     where w.competition_id = p_comp
       and not exists (select 1 from sx_desired_winners d where d.user_id = w.user_id)
  loop
    insert into public.competition_winner_removals
      (competition_id, user_id, user_name, rank, prize, phone, was_verified, was_paid, paid_at, payment_ref, reason, removed_by, removed_by_name)
    values
      (p_comp, rec.user_id, rec.name, rec.rank, rec.prize, rec.phone, rec.verified, rec.paid, rec.paid_at, rec.payment_ref,
       coalesce(nullif(p_reason, ''), 'Removed by organiser'), p_actor, actor_name);
    if (select coalesce(notify_competitions, true) from public.users where id = rec.user_id) then
      perform private.sx_notify(rec.user_id, 'prize', 'Your competition prize was removed',
        'Rank #' || rec.rank || ': ' || rec.prize || ' — this prize place was removed by the organiser.'
        || case when coalesce(p_reason, '') <> '' then ' Reason: ' || p_reason else '' end
        || ' If you think this is a mistake, contact the Simplexer team.',
        '/competitions/' || p_comp::text);
    end if;
    delete from public.competition_winners
     where competition_id = p_comp and user_id = rec.user_id;
  end loop;

  -- Park the movers at negative ranks (primary-key safety, as in 0023).
  update public.competition_winners w
     set rank = -w.rank
   where w.competition_id = p_comp
     and exists (select 1 from sx_desired_winners d
                  where d.user_id = w.user_id and d.rk <> w.rank);

  -- Movers take their final rank/prize and get one "prize changed"
  -- message. Their phone/verified/paid/payment_ref stay untouched.
  for rec in
    select w.user_id, d.rk, d.prize, d.name
      from public.competition_winners w
      join sx_desired_winners d on d.user_id = w.user_id
     where w.competition_id = p_comp and w.rank < 0
  loop
    update public.competition_winners
       set rank = rec.rk, prize = rec.prize, name = rec.name
     where competition_id = p_comp and user_id = rec.user_id;
    if (select coalesce(notify_competitions, true) from public.users where id = rec.user_id) then
      perform private.sx_notify(rec.user_id, 'prize', 'Your competition prize changed',
        'You are now rank #' || rec.rk || ': ' || rec.prize || '.',
        '/competitions/' || p_comp::text);
    end if;
  end loop;

  -- New students entering the money (the insert trigger sends "you won").
  insert into public.competition_winners (competition_id, rank, user_id, name, prize)
  select p_comp, d.rk, d.user_id, d.name, d.prize
    from sx_desired_winners d
   where not exists (select 1 from public.competition_winners w
                      where w.competition_id = p_comp and w.user_id = d.user_id);
end $$;
revoke all on function private.competition_rebuild_winners(uuid, uuid, uuid, text, boolean) from public, anon, authenticated;

-- ---------- wrappers ----------
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

  if outgoing is not null and exists (
    select 1 from public.competition_winners
     where competition_id = comp and rank = rnk and paid
  ) then
    raise exception 'winner_already_paid';
  end if;

  if outgoing is not null then
    insert into public.competition_removed_winners (competition_id, user_id, reason)
    values (comp, outgoing, 'replaced by organiser')
    on conflict (competition_id, user_id) do nothing;
  end if;

  perform private.competition_rebuild_winners(comp, outgoing, auth.uid(), 'Replaced by organiser', false);
end $$;

create or replace function public.competition_disqualify(comp uuid, uid uuid, why text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_competition(comp) then raise exception 'forbidden'; end if;
  if exists (select 1 from public.competition_winners
              where competition_id = comp and user_id = uid and paid) then
    raise exception 'winner_already_paid';
  end if;
  update public.competition_attempts
     set disqualified = true, dq_reason = left(coalesce(why, ''), 200)
   where competition_id = comp and user_id = uid;
  perform private.competition_rebuild_winners(comp, null, auth.uid(),
    'Disqualified' || case when coalesce(why, '') <> '' then ': ' || why else '' end, false);
end $$;

-- The explicit escape hatch for "cheating found AFTER payment": demands
-- a written reason, keeps the student out, and the rebuild logs the
-- removal with was_paid + the payment reference on permanent record.
create or replace function public.competition_remove_paid_winner(comp uuid, uid uuid, why text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_competition(comp) then raise exception 'forbidden'; end if;
  if coalesce(trim(why), '') = '' then raise exception 'reason_required'; end if;
  if not exists (select 1 from public.competition_winners
                  where competition_id = comp and user_id = uid) then
    raise exception 'not_a_winner';
  end if;
  if not exists (select 1 from public.competition_winners
                  where competition_id = comp and user_id = uid and paid) then
    raise exception 'not_paid';
  end if;

  insert into public.competition_removed_winners (competition_id, user_id, reason)
  values (comp, uid, 'paid winner removed')
  on conflict (competition_id, user_id) do nothing;

  update public.competition_attempts
     set disqualified = true, dq_reason = left('Paid winner removed: ' || why, 200)
   where competition_id = comp and user_id = uid;

  perform private.competition_rebuild_winners(comp, uid, auth.uid(),
    'Paid winner removed after payment: ' || why, true);
end $$;
grant execute on function public.competition_remove_paid_winner(uuid, uuid, text) to authenticated;
