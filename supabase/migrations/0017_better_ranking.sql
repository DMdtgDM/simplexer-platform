-- 0017 — Better competition ranking (Daniel's note: "the ranking must be better")
--
-- Old rule: score, then total duration, then submission time. Total duration
-- is unfair when attempts have different question totals (e.g. a competition
-- where some questions were dropped): a player with more questions is slower
-- through no fault of their own.
--
-- New rule, applied everywhere a ranking is produced (leaderboard, finalize,
-- replace-winner):
--   1. Highest score wins.
--   2. Tie-break: lowest SECONDS PER QUESTION (duration / total).
--   3. Then: earliest submission.
-- Disqualified attempts never rank (unchanged from 0012).

create or replace function public.competition_leaderboard(comp uuid)
returns table (rank int, name text, score int, total int, duration_seconds int, is_me boolean)
language sql stable security definer set search_path = public as $$
  select (row_number() over (order by a.score desc,
                                     (a.duration_seconds::numeric / greatest(a.total, 1)) asc,
                                     a.submitted_at asc))::int,
         public.display_name(u.name), a.score, a.total, a.duration_seconds, a.user_id = auth.uid()
  from public.competition_attempts a
  join public.users u on u.id = a.user_id
  join public.competitions c on c.id = a.competition_id
  where a.competition_id = comp and a.submitted_at is not null and not a.disqualified and c.status in ('published', 'finalized')
  order by 1
$$;

create or replace function public.competition_finalize(comp uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c public.competitions;
begin
  if not public.can_manage_competition(comp) then raise exception 'forbidden'; end if;
  select * into c from public.competitions where id = comp;
  if now() < c.ends_at then raise exception 'not_ended'; end if;
  if c.status = 'finalized' then return; end if;
  perform public.competition_settle(comp);
  insert into public.competition_winners (competition_id, rank, user_id, name, prize)
  select comp, r.rk, r.user_id, r.name, case r.rk when 1 then c.prize_1 when 2 then c.prize_2 else c.prize_3 end
  from (
    select (row_number() over (order by a.score desc,
                                        (a.duration_seconds::numeric / greatest(a.total, 1)) asc,
                                        a.submitted_at asc))::int rk, a.user_id, u.name
    from public.competition_attempts a join public.users u on u.id = a.user_id
    where a.competition_id = comp and a.submitted_at is not null and not a.disqualified
  ) r
  where r.rk <= 3 and (case r.rk when 1 then c.prize_1 when 2 then c.prize_2 else c.prize_3 end) <> '';
  perform set_config('sx.finalizing', '1', true);
  update public.competitions set status = 'finalized' where id = comp;
end $$;

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
   order by a.score desc, (a.duration_seconds::numeric / greatest(a.total, 1)) asc, a.submitted_at asc
   limit 1;

  if cand is not null then
    insert into public.competition_winners (competition_id, rank, user_id, name, prize)
    values (comp, rnk, cand.user_id, cand.name,
            case rnk when 1 then c.prize_1 when 2 then c.prize_2 else c.prize_3 end);
  end if;
end $$;
