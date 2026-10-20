-- Competitions: a quiz + a time window + a prize. Ranking uses the existing quiz_attempts,
-- so people compete by taking the quiz through the normal /quiz/[quizId] page.
create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  prize text not null default '',
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  created_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index competitions_dates_idx on public.competitions (starts_at desc);

alter table public.competitions enable row level security;
create policy "anyone reads competitions" on public.competitions for select using (true);
create policy "teachers and admins create competitions" on public.competitions
  for insert with check (auth.uid() = created_by and public.is_teacher_or_admin(auth.uid()));
create policy "creator or admin deletes competition" on public.competitions
  for delete using (auth.uid() = created_by or public.is_admin(auth.uid()));

-- Leaderboard: each person's best score inside the window; ties go to whoever finished first.
-- security definer because quiz_attempts is private per user; only names and scores are exposed.
create function public.competition_leaderboard(comp uuid)
returns table (name text, score int, total int, attempted_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.name, t.score, t.total, t.attempted_at from (
    select distinct on (a.user_id) u.name, a.score, a.total, a.attempted_at
    from public.competitions c
    join public.quiz_attempts a on a.quiz_id = c.quiz_id and a.attempted_at between c.starts_at and c.ends_at
    join public.users u on u.id = a.user_id
    where c.id = comp
    order by a.user_id, a.score desc, a.attempted_at asc
  ) t
  order by t.score desc, t.attempted_at asc
  limit 20
$$;
grant execute on function public.competition_leaderboard(uuid) to anon, authenticated;
