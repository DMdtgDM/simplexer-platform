-- Competition engine: private questions graded on the server, one timed attempt per person,
-- entry control (open / access code / admin-approved with optional fee), and prize payouts.

drop function if exists public.competition_leaderboard(uuid);

create function public.can_manage_competition(comp uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin(auth.uid())
      or exists (select 1 from public.competitions where id = comp and created_by = auth.uid())
$$;

alter table public.competitions
  alter column quiz_id drop not null,
  add column access text not null default 'open' check (access in ('open', 'code', 'approval')),
  add column entry_fee int not null default 0 check (entry_fee >= 0),
  add column payment_info text not null default '',
  add column time_limit_min int not null default 10 check (time_limit_min between 1 and 180),
  add column prize_1 text not null default '',
  add column prize_2 text not null default '',
  add column prize_3 text not null default '',
  add column status text not null default 'draft' check (status in ('draft', 'published', 'finalized'));

drop policy "anyone reads competitions" on public.competitions;
create policy "published competitions are public" on public.competitions
  for select using (status <> 'draft' or public.can_manage_competition(id));
create policy "managers update competitions" on public.competitions
  for update using (public.can_manage_competition(id));

-- The access code lives apart from the public competitions table.
create table public.competition_secrets (
  competition_id uuid primary key references public.competitions (id) on delete cascade,
  access_code text not null
);
alter table public.competition_secrets enable row level security;
create policy "managers manage secrets" on public.competition_secrets
  for all using (public.can_manage_competition(competition_id)) with check (public.can_manage_competition(competition_id));

create table public.competition_questions (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  position int not null default 0,
  body text not null
);
create table public.competition_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.competition_questions (id) on delete cascade,
  position int not null default 0,
  body text not null,
  is_correct boolean not null default false
);
alter table public.competition_questions enable row level security;
alter table public.competition_options enable row level security;
create policy "managers manage questions" on public.competition_questions
  for all using (public.can_manage_competition(competition_id)) with check (public.can_manage_competition(competition_id));
create policy "managers manage options" on public.competition_options
  for all using (exists (select 1 from public.competition_questions q where q.id = question_id and public.can_manage_competition(q.competition_id)))
  with check (exists (select 1 from public.competition_questions q where q.id = question_id and public.can_manage_competition(q.competition_id)));

create table public.competition_entries (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  user_name text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  payment_ref text not null default '',
  created_at timestamptz not null default now(),
  unique (competition_id, user_id)
);
alter table public.competition_entries enable row level security;
create policy "own or managed entries readable" on public.competition_entries
  for select using (user_id = auth.uid() or public.can_manage_competition(competition_id));
create policy "managers decide entries" on public.competition_entries
  for update using (public.can_manage_competition(competition_id));

create table public.competition_attempts (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score int,
  total int,
  duration_seconds int,
  answers jsonb,
  unique (competition_id, user_id)
);
alter table public.competition_attempts enable row level security;
create policy "own or managed attempts readable" on public.competition_attempts
  for select using (user_id = auth.uid() or public.can_manage_competition(competition_id));

create table public.competition_winners (
  competition_id uuid not null references public.competitions (id) on delete cascade,
  rank int not null,
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null default '',
  prize text not null default '',
  phone text not null default '',
  paid boolean not null default false,
  paid_at timestamptz,
  primary key (competition_id, rank)
);
alter table public.competition_winners enable row level security;
create policy "winner or manager reads winner rows" on public.competition_winners
  for select using (user_id = auth.uid() or public.can_manage_competition(competition_id));
create policy "managers mark paid" on public.competition_winners
  for update using (public.can_manage_competition(competition_id));

-- ---------------------------------------------------------------- functions
create function public.competition_join(comp uuid, code text default '', pay_ref text default '') returns text
language plpgsql security definer set search_path = public as $$
declare c public.competitions; st text; nm text; secret text;
begin
  if auth.uid() is null then raise exception 'login_required'; end if;
  select * into c from public.competitions where id = comp and status = 'published';
  if not found then raise exception 'closed'; end if;
  if now() > c.ends_at then raise exception 'ended'; end if;
  select status into st from public.competition_entries where competition_id = comp and user_id = auth.uid();
  if found then return st; end if;
  if c.access = 'open' then st := 'approved';
  elsif c.access = 'code' then
    select access_code into secret from public.competition_secrets where competition_id = comp;
    if secret is null or lower(trim(code)) <> lower(secret) then raise exception 'wrong_code'; end if;
    st := 'approved';
  else
    if c.entry_fee > 0 and trim(coalesce(pay_ref, '')) = '' then raise exception 'payment_ref_needed'; end if;
    st := 'pending';
  end if;
  select name into nm from public.users where id = auth.uid();
  insert into public.competition_entries (competition_id, user_id, user_name, status, payment_ref)
  values (comp, auth.uid(), coalesce(nm, ''), st, coalesce(pay_ref, ''));
  return st;
end $$;

create function public.competition_start(comp uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare c public.competitions; a uuid;
begin
  select * into c from public.competitions where id = comp and status = 'published';
  if not found then raise exception 'closed'; end if;
  if now() < c.starts_at or now() > c.ends_at then raise exception 'not_live'; end if;
  if not exists (select 1 from public.competition_entries where competition_id = comp and user_id = auth.uid() and status = 'approved') then
    raise exception 'no_entry';
  end if;
  select id into a from public.competition_attempts where competition_id = comp and user_id = auth.uid();
  if a is null then
    insert into public.competition_attempts (competition_id, user_id) values (comp, auth.uid()) returning id into a;
  end if;
  return a;
end $$;

-- Questions without the answers, in a different order for every person.
create function public.competition_get_questions(att uuid)
returns table (id uuid, body text, options jsonb, deadline timestamptz, submitted boolean)
language sql stable security definer set search_path = public as $$
  select q.id, q.body,
    (select jsonb_agg(jsonb_build_object('id', o.id, 'body', o.body) order by md5(o.id::text || a.id::text))
       from public.competition_options o where o.question_id = q.id),
    least(a.started_at + make_interval(mins => c.time_limit_min), c.ends_at),
    a.submitted_at is not null
  from public.competition_attempts a
  join public.competitions c on c.id = a.competition_id
  join public.competition_questions q on q.competition_id = c.id
  where a.id = att and a.user_id = auth.uid()
  order by md5(q.id::text || a.id::text)
$$;

create function public.competition_submit(att uuid, ans jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare a public.competition_attempts; c public.competitions; dl timestamptz; sc int := 0; tot int;
begin
  select * into a from public.competition_attempts where id = att and user_id = auth.uid();
  if not found then raise exception 'no_attempt'; end if;
  if a.submitted_at is not null then return; end if;
  select * into c from public.competitions where id = a.competition_id;
  dl := least(a.started_at + make_interval(mins => c.time_limit_min), c.ends_at);
  select count(*) into tot from public.competition_questions where competition_id = c.id;
  if now() <= dl + interval '20 seconds' then
    select count(*) into sc
    from public.competition_questions q
    join public.competition_options o on o.question_id = q.id and o.is_correct
    where q.competition_id = c.id and (ans ->> q.id::text) = o.id::text;
  end if;
  update public.competition_attempts
     set submitted_at = now(), score = sc, total = tot, answers = ans,
         duration_seconds = least(extract(epoch from now() - started_at)::int, c.time_limit_min * 60)
   where id = att;
end $$;

create function public.competition_leaderboard(comp uuid)
returns table (rank int, name text, score int, total int, duration_seconds int, is_me boolean)
language sql stable security definer set search_path = public as $$
  select (row_number() over (order by a.score desc, a.duration_seconds asc, a.submitted_at asc))::int,
         u.name, a.score, a.total, a.duration_seconds, a.user_id = auth.uid()
  from public.competition_attempts a
  join public.users u on u.id = a.user_id
  join public.competitions c on c.id = a.competition_id
  where a.competition_id = comp and a.submitted_at is not null and c.status in ('published', 'finalized')
  order by 1
$$;

create function public.competition_counts() returns table (competition_id uuid, players int)
language sql stable security definer set search_path = public as $$
  select e.competition_id, count(*)::int from public.competition_entries e where e.status = 'approved' group by 1
$$;

create function public.competition_public_winners(comp uuid)
returns table (rank int, name text, prize text, paid boolean)
language sql stable security definer set search_path = public as $$
  select w.rank, w.name, w.prize, w.paid from public.competition_winners w where w.competition_id = comp order by w.rank
$$;

create function public.competition_finalize(comp uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c public.competitions;
begin
  if not public.can_manage_competition(comp) then raise exception 'forbidden'; end if;
  select * into c from public.competitions where id = comp;
  if now() < c.ends_at then raise exception 'not_ended'; end if;
  if c.status = 'finalized' then return; end if;
  insert into public.competition_winners (competition_id, rank, user_id, name, prize)
  select comp, r.rk, r.user_id, r.name, case r.rk when 1 then c.prize_1 when 2 then c.prize_2 else c.prize_3 end
  from (
    select (row_number() over (order by a.score desc, a.duration_seconds asc, a.submitted_at asc))::int rk, a.user_id, u.name
    from public.competition_attempts a join public.users u on u.id = a.user_id
    where a.competition_id = comp and a.submitted_at is not null
  ) r
  where r.rk <= 3 and (case r.rk when 1 then c.prize_1 when 2 then c.prize_2 else c.prize_3 end) <> '';
  update public.competitions set status = 'finalized' where id = comp;
end $$;

create function public.competition_save_phone(comp uuid, ph text) returns void
language sql security definer set search_path = public as $$
  update public.competition_winners set phone = left(trim(ph), 30) where competition_id = comp and user_id = auth.uid()
$$;

grant execute on function public.competition_join(uuid, text, text), public.competition_start(uuid),
  public.competition_get_questions(uuid), public.competition_submit(uuid, jsonb),
  public.competition_finalize(uuid), public.competition_save_phone(uuid, text) to authenticated;
grant execute on function public.competition_leaderboard(uuid), public.competition_counts(),
  public.competition_public_winners(uuid), public.can_manage_competition(uuid) to anon, authenticated;
