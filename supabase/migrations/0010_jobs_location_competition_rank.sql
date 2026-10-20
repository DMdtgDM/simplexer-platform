-- Jobs: where and when, so in-person jobs make sense.
alter table public.jobs
  add column city text,
  add column area text,
  add column schedule text,
  add column sessions_per_week int not null default 1 check (sessions_per_week between 1 and 14),
  add column language text not null default 'Amharic';

-- Competitions: full ranked list with "is this me", so the page can show your position.
drop function if exists public.competition_leaderboard(uuid);
create function public.competition_leaderboard(comp uuid)
returns table (rank int, name text, score int, total int, attempted_at timestamptz, is_me boolean)
language sql stable security definer set search_path = public as $$
  select (row_number() over (order by t.score desc, t.attempted_at asc))::int,
         t.name, t.score, t.total, t.attempted_at, (t.user_id = auth.uid())
  from (
    select distinct on (a.user_id) a.user_id, u.name, a.score, a.total, a.attempted_at
    from public.competitions c
    join public.quiz_attempts a on a.quiz_id = c.quiz_id and a.attempted_at between c.starts_at and c.ends_at
    join public.users u on u.id = a.user_id
    where c.id = comp
    order by a.user_id, a.score desc, a.attempted_at asc
  ) t
  order by 1
$$;
grant execute on function public.competition_leaderboard(uuid) to anon, authenticated;
