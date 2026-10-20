-- SIMPLEXER: run this ONCE in the Supabase SQL editor. It adds everything missing (migrations 0007 to 0014).
-- Your database currently stops at 0006. Do not run it twice.

-- ============================================================ 0007_tutor_jobs
-- Tutor job board: students/parents post a need, teachers apply, the poster accepts one.
create type job_status as enum ('open', 'filled', 'closed');

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.users (id) on delete cascade,
  poster_name text not null default '',
  subject text not null,
  grade text,
  mode text not null default 'Online',
  budget int not null default 0 check (budget >= 0),
  description text not null,
  status job_status not null default 'open',
  tutor_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index jobs_status_idx on public.jobs (status, created_at desc);

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  applicant_id uuid not null references public.users (id) on delete cascade,
  applicant_name text not null default '',
  message text not null,
  rate int not null default 0 check (rate >= 0),
  created_at timestamptz not null default now(),
  unique (job_id, applicant_id)
);
create index job_applications_job_idx on public.job_applications (job_id);

alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;

create policy "anyone reads jobs" on public.jobs for select using (true);
create policy "signed-in users post jobs" on public.jobs
  for insert with check (auth.uid() = poster_id);
create policy "poster or admin updates job" on public.jobs
  for update using (auth.uid() = poster_id or public.is_admin(auth.uid()));
create policy "poster or admin deletes job" on public.jobs
  for delete using (auth.uid() = poster_id or public.is_admin(auth.uid()));

create policy "teachers apply to open jobs" on public.job_applications
  for insert with check (
    auth.uid() = applicant_id
    and public.is_teacher_or_admin(auth.uid())
    and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open')
  );
create policy "applicant, poster or admin reads applications" on public.job_applications
  for select using (
    auth.uid() = applicant_id
    or public.is_admin(auth.uid())
    or exists (select 1 from public.jobs j where j.id = job_id and j.poster_id = auth.uid())
  );
create policy "applicant withdraws application" on public.job_applications
  for delete using (auth.uid() = applicant_id);

-- ============================================================ 0008_competitions
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

-- ============================================================ 0009_admin_only_jobs
-- Only admins can post jobs. Teachers apply; everyone else browses.
drop policy if exists "signed-in users post jobs" on public.jobs;
create policy "admins post jobs" on public.jobs
  for insert with check (auth.uid() = poster_id and public.is_admin(auth.uid()));

-- ============================================================ 0010_jobs_location_competition_rank
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

-- ============================================================ 0011_competition_engine
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

-- ============================================================ 0012_security_and_resilience
-- Security hardening + resilient competitions + reports.

-- 1. Nobody but an admin can change a role. (SQL editor / service role have no auth.uid(), so you still can.)
create function public.guard_user_role() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    if tg_op = 'INSERT' then new.role := 'student';
    elsif new.role is distinct from old.role then new.role := old.role; end if;
  end if;
  return new;
end $$;
create trigger guard_user_role before insert or update on public.users
  for each row execute function public.guard_user_role();

-- 2. Teacher edits can never publish themselves; any teacher edit sends content back to review.
create function public.guard_course_status() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then new.status := 'pending'; end if;
  return new;
end $$;
create trigger guard_course_status before insert or update on public.courses
  for each row execute function public.guard_course_status();

create function public.guard_lesson_status() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) and new.topic_id is not null then new.status := 'pending'; end if;
  return new;
end $$;
create trigger guard_lesson_status before insert or update on public.lessons
  for each row execute function public.guard_lesson_status();

create function public.reset_course_on_lesson_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) and new.course_id is not null then
    update public.courses set status = 'pending' where id = new.course_id and status <> 'pending';
  end if;
  return null;
end $$;
create trigger reset_course_on_lesson_change after insert or update on public.lessons
  for each row execute function public.reset_course_on_lesson_change();

-- 3. Competition rules: only admins attach money, rules freeze once published, finalizing only via the function.
create function public.guard_competition() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    new.entry_fee := 0; new.payment_info := ''; new.prize_1 := ''; new.prize_2 := ''; new.prize_3 := '';
  end if;
  if tg_op = 'UPDATE' and auth.uid() is not null then
    if old.status <> 'draft' then
      new.access := old.access; new.entry_fee := old.entry_fee; new.payment_info := old.payment_info;
      new.time_limit_min := old.time_limit_min; new.starts_at := old.starts_at; new.ends_at := old.ends_at;
      new.prize_1 := old.prize_1; new.prize_2 := old.prize_2; new.prize_3 := old.prize_3; new.created_by := old.created_by;
    end if;
    if new.status is distinct from old.status and not (
      (old.status = 'draft' and new.status = 'published')
      or (old.status = 'published' and new.status = 'finalized' and current_setting('sx.finalizing', true) = '1')
    ) then new.status := old.status; end if;
  end if;
  return new;
end $$;
create trigger guard_competition before insert or update on public.competitions
  for each row execute function public.guard_competition();

drop policy "creator or admin deletes competition" on public.competitions;
create policy "managers delete unfinished competitions" on public.competitions
  for delete using (public.can_manage_competition(id) and status <> 'finalized');

create function public.competition_is_draft(comp uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.competitions where id = comp and status = 'draft')
$$;
drop policy "managers manage questions" on public.competition_questions;
create policy "managers read questions" on public.competition_questions for select using (public.can_manage_competition(competition_id));
create policy "managers edit questions while draft" on public.competition_questions
  for all using (public.can_manage_competition(competition_id) and public.competition_is_draft(competition_id))
  with check (public.can_manage_competition(competition_id) and public.competition_is_draft(competition_id));
drop policy "managers manage options" on public.competition_options;
create policy "managers read options" on public.competition_options for select
  using (exists (select 1 from public.competition_questions q where q.id = question_id and public.can_manage_competition(q.competition_id)));
create policy "managers edit options while draft" on public.competition_options for all
  using (exists (select 1 from public.competition_questions q where q.id = question_id and public.can_manage_competition(q.competition_id) and public.competition_is_draft(q.competition_id)))
  with check (exists (select 1 from public.competition_questions q where q.id = question_id and public.can_manage_competition(q.competition_id) and public.competition_is_draft(q.competition_id)));

-- 4. Answers are saved on the server as people pick them, so a dropped connection loses nothing.
alter table public.competition_attempts
  add column disqualified boolean not null default false,
  add column dq_reason text not null default '';
create table public.competition_answers (
  attempt_id uuid not null references public.competition_attempts (id) on delete cascade,
  question_id uuid not null,
  option_id uuid not null,
  saved_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);
alter table public.competition_answers enable row level security;
create table public.competition_join_failures (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null, user_id uuid not null, at timestamptz not null default now()
);
alter table public.competition_join_failures enable row level security;

create function public.display_name(n text) returns text language sql immutable as $$
  select case
    when trim(coalesce(n, '')) = '' then 'Student'
    when position(' ' in trim(n)) = 0 then trim(n)
    else split_part(trim(n), ' ', 1) || ' ' || upper(left(split_part(trim(n), ' ', 2), 1)) || '.'
  end
$$;

create function public.competition_save_answer(att uuid, qid uuid, oid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a public.competition_attempts; c public.competitions;
begin
  select * into a from public.competition_attempts where id = att and user_id = auth.uid() and submitted_at is null;
  if not found then return; end if;
  select * into c from public.competitions where id = a.competition_id;
  if now() > least(a.started_at + make_interval(mins => c.time_limit_min), c.ends_at) + interval '20 seconds' then return; end if;
  if not exists (select 1 from public.competition_options o join public.competition_questions q on q.id = o.question_id
                 where o.id = oid and q.id = qid and q.competition_id = a.competition_id) then return; end if;
  insert into public.competition_answers (attempt_id, question_id, option_id) values (att, qid, oid)
  on conflict (attempt_id, question_id) do update set option_id = excluded.option_id, saved_at = now();
end $$;

create function public.competition_my_answers(att uuid) returns table (question_id uuid, option_id uuid)
language sql stable security definer set search_path = public as $$
  select a.question_id, a.option_id from public.competition_answers a
  join public.competition_attempts t on t.id = a.attempt_id where a.attempt_id = att and t.user_id = auth.uid()
$$;

create function public.competition_grade(att uuid) returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.competition_answers a
  join public.competition_attempts t on t.id = a.attempt_id
  join public.competition_options o on o.id = a.option_id and o.is_correct
  join public.competition_questions q on q.id = o.question_id and q.id = a.question_id and q.competition_id = t.competition_id
  where a.attempt_id = att
$$;

create or replace function public.competition_submit(att uuid, ans jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare a public.competition_attempts; c public.competitions; dl timestamptz; k text; v text;
begin
  select * into a from public.competition_attempts where id = att and user_id = auth.uid();
  if not found then raise exception 'no_attempt'; end if;
  if a.submitted_at is not null then return; end if;
  select * into c from public.competitions where id = a.competition_id;
  dl := least(a.started_at + make_interval(mins => c.time_limit_min), c.ends_at);
  if now() <= dl + interval '20 seconds' then
    for k, v in select key, value from jsonb_each_text(coalesce(ans, '{}'::jsonb)) loop
      perform public.competition_save_answer(att, k::uuid, v::uuid);
    end loop;
  end if;
  update public.competition_attempts
     set submitted_at = now(), score = public.competition_grade(att),
         total = (select count(*) from public.competition_questions where competition_id = c.id), answers = null,
         duration_seconds = least(extract(epoch from now() - started_at)::int, c.time_limit_min * 60)
   where id = att;
end $$;

-- Anyone who ran out of time (or lost connection) still gets scored from what was saved.
create function public.competition_settle(comp uuid) returns void language plpgsql security definer set search_path = public as $$
declare c public.competitions; a record; dl timestamptz;
begin
  select * into c from public.competitions where id = comp;
  if not found then return; end if;
  for a in select * from public.competition_attempts where competition_id = comp and submitted_at is null loop
    dl := least(a.started_at + make_interval(mins => c.time_limit_min), c.ends_at);
    if now() > dl + interval '30 seconds' then
      update public.competition_attempts
         set submitted_at = dl, score = public.competition_grade(a.id),
             total = (select count(*) from public.competition_questions where competition_id = comp),
             duration_seconds = greatest(0, extract(epoch from dl - a.started_at)::int)
       where id = a.id;
    end if;
  end loop;
end $$;

create or replace function public.competition_join(comp uuid, code text default '', pay_ref text default '') returns text
language plpgsql security definer set search_path = public as $$
declare c public.competitions; st text; nm text; secret text; fails int;
begin
  if auth.uid() is null then raise exception 'login_required'; end if;
  select * into c from public.competitions where id = comp and status = 'published';
  if not found then raise exception 'closed'; end if;
  if now() > c.ends_at then raise exception 'ended'; end if;
  if c.created_by = auth.uid() then raise exception 'organiser'; end if;
  select status into st from public.competition_entries where competition_id = comp and user_id = auth.uid();
  if found then return st; end if;
  if c.access = 'open' then st := 'approved';
  elsif c.access = 'code' then
    select count(*) into fails from public.competition_join_failures
      where competition_id = comp and user_id = auth.uid() and at > now() - interval '10 minutes';
    if fails >= 5 then return 'too_many'; end if;
    select access_code into secret from public.competition_secrets where competition_id = comp;
    if secret is null or lower(trim(code)) <> lower(secret) then
      insert into public.competition_join_failures (competition_id, user_id) values (comp, auth.uid());
      return 'wrong_code';
    end if;
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

create or replace function public.competition_leaderboard(comp uuid)
returns table (rank int, name text, score int, total int, duration_seconds int, is_me boolean)
language sql stable security definer set search_path = public as $$
  select (row_number() over (order by a.score desc, a.duration_seconds asc, a.submitted_at asc))::int,
         public.display_name(u.name), a.score, a.total, a.duration_seconds, a.user_id = auth.uid()
  from public.competition_attempts a
  join public.users u on u.id = a.user_id
  join public.competitions c on c.id = a.competition_id
  where a.competition_id = comp and a.submitted_at is not null and not a.disqualified and c.status in ('published', 'finalized')
  order by 1
$$;

create or replace function public.competition_public_winners(comp uuid)
returns table (rank int, name text, prize text, paid boolean)
language sql stable security definer set search_path = public as $$
  select w.rank, public.display_name(w.name), w.prize, w.paid from public.competition_winners w where w.competition_id = comp order by w.rank
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
    select (row_number() over (order by a.score desc, a.duration_seconds asc, a.submitted_at asc))::int rk, a.user_id, u.name
    from public.competition_attempts a join public.users u on u.id = a.user_id
    where a.competition_id = comp and a.submitted_at is not null and not a.disqualified
  ) r
  where r.rk <= 3 and (case r.rk when 1 then c.prize_1 when 2 then c.prize_2 else c.prize_3 end) <> '';
  perform set_config('sx.finalizing', '1', true);
  update public.competitions set status = 'finalized' where id = comp;
end $$;

create function public.competition_disqualify(comp uuid, uid uuid, why text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_competition(comp) then raise exception 'forbidden'; end if;
  if (select status from public.competitions where id = comp) = 'finalized' then raise exception 'finalized'; end if;
  update public.competition_attempts set disqualified = true, dq_reason = left(coalesce(why, ''), 200)
   where competition_id = comp and user_id = uid;
end $$;

grant execute on function public.competition_save_answer(uuid, uuid, uuid), public.competition_my_answers(uuid),
  public.competition_disqualify(uuid, uuid, text) to authenticated;
grant execute on function public.competition_settle(uuid), public.display_name(text) to anon, authenticated;

-- 5. "Report a mistake" from any page.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  kind text not null,
  target text not null default '',
  note text not null check (char_length(note) between 3 and 1000),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "signed-in users report" on public.reports for insert to authenticated with check (user_id = auth.uid());
create policy "admins read reports" on public.reports for select using (public.is_admin(auth.uid()));
create policy "admins resolve reports" on public.reports for update using (public.is_admin(auth.uid()));

-- ============================================================ 0013_tutors_requests_visibility
-- Tutor directory (verified by admins), service requests from parents/students, and profile visibility.

-- 1. Account type and visibility for every user. Role (student/teacher/admin) stays admin-controlled.
alter table public.users
  add column account_type text not null default 'student' check (account_type in ('student', 'parent')),
  add column visibility text not null default 'private' check (visibility in ('private', 'public')),
  add column bio text not null default '' check (char_length(bio) <= 300);

-- 2. Tutor profiles
create table public.tutor_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'pending', 'verified', 'rejected', 'suspended')),
  legal_name text not null default '',
  phone text not null default '',
  city text not null default '',
  area text not null default '',
  subjects text[] not null default '{}',
  levels text[] not null default '{}',
  languages text[] not null default '{}',
  education text not null default '',
  institution text not null default '',
  field_of_study text not null default '',
  national_exam text not null default '',
  experience_years int not null default 0 check (experience_years between 0 and 60),
  bio text not null default '' check (char_length(bio) <= 800),
  mode text not null default 'Both' check (mode in ('Online', 'In person', 'Both')),
  rate int not null default 0 check (rate >= 0),
  availability text not null default '',
  visible boolean not null default true,
  id_doc text, education_doc text, exam_doc text, other_doc text,
  admin_note text not null default '',
  assessment_score int check (assessment_score between 1 and 5),
  recommended boolean not null default false,
  submitted_at timestamptz, verified_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.tutor_profiles enable row level security;
create policy "tutors read own profile" on public.tutor_profiles for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "tutors create own profile" on public.tutor_profiles for insert with check (user_id = auth.uid());
create policy "tutors edit own profile" on public.tutor_profiles for update using (user_id = auth.uid());
create policy "admins manage tutor profiles" on public.tutor_profiles for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create function public.guard_tutor_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    if tg_op = 'INSERT' then
      new.status := 'draft'; new.admin_note := ''; new.assessment_score := null; new.recommended := false; new.verified_at := null;
    else
      new.admin_note := old.admin_note; new.assessment_score := old.assessment_score;
      new.recommended := old.recommended; new.verified_at := old.verified_at;
      if new.status is distinct from old.status and not (old.status in ('draft', 'rejected') and new.status = 'pending') then
        new.status := old.status;
      end if;
      if old.status = 'verified' and (
        new.legal_name is distinct from old.legal_name or new.id_doc is distinct from old.id_doc
        or new.education_doc is distinct from old.education_doc or new.exam_doc is distinct from old.exam_doc
        or new.other_doc is distinct from old.other_doc or new.education is distinct from old.education
        or new.institution is distinct from old.institution or new.field_of_study is distinct from old.field_of_study
        or new.national_exam is distinct from old.national_exam
      ) then new.status := 'pending'; end if;
      if new.status = 'pending' and old.status <> 'pending' then new.submitted_at := now(); end if;
    end if;
  elsif tg_op = 'UPDATE' and new.status = 'verified' and old.status <> 'verified' then
    new.verified_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger guard_tutor_profile before insert or update on public.tutor_profiles
  for each row execute function public.guard_tutor_profile();

-- Public directory: verified and visible tutors only, no contact details, no documents.
create function public.tutor_directory()
returns table (user_id uuid, name text, city text, subjects text[], levels text[], languages text[], mode text, rate int, experience_years int, education text, recommended boolean)
language sql stable security definer set search_path = public as $$
  select t.user_id, public.display_name(u.name), t.city, t.subjects, t.levels, t.languages, t.mode, t.rate, t.experience_years, t.education, t.recommended
  from public.tutor_profiles t join public.users u on u.id = t.user_id
  where t.status = 'verified' and t.visible
  order by t.recommended desc, t.verified_at desc
$$;
create function public.tutor_public(uid uuid)
returns table (user_id uuid, name text, city text, subjects text[], levels text[], languages text[], mode text, rate int, experience_years int, education text, field_of_study text, bio text, availability text, recommended boolean)
language sql stable security definer set search_path = public as $$
  select t.user_id, public.display_name(u.name), t.city, t.subjects, t.levels, t.languages, t.mode, t.rate, t.experience_years, t.education, t.field_of_study, t.bio, t.availability, t.recommended
  from public.tutor_profiles t join public.users u on u.id = t.user_id
  where t.user_id = uid and t.status = 'verified' and t.visible
$$;
grant execute on function public.tutor_directory(), public.tutor_public(uuid) to anon, authenticated;

-- Verified tutors may apply to jobs (teachers and admins still can).
drop policy "teachers apply to open jobs" on public.job_applications;
create policy "verified tutors and teachers apply to open jobs" on public.job_applications
  for insert with check (
    auth.uid() = applicant_id
    and (public.is_teacher_or_admin(auth.uid())
         or exists (select 1 from public.tutor_profiles t where t.user_id = auth.uid() and t.status = 'verified'))
    and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open')
  );

-- 3. Requests from parents and students
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  requester_name text not null default '',
  kind text not null default 'tutor' check (kind in ('tutor', 'other')),
  tutor_id uuid references public.users (id) on delete set null,
  subject text not null default '',
  grade text, mode text not null default 'Online', city text, area text, schedule text,
  budget int not null default 0 check (budget >= 0),
  description text not null check (char_length(description) between 3 and 2000),
  status text not null default 'new' check (status in ('new', 'reviewing', 'matched', 'closed')),
  admin_note text not null default '',
  job_id uuid references public.jobs (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.service_requests enable row level security;
create policy "send own requests" on public.service_requests for insert to authenticated with check (requester_id = auth.uid() and status = 'new');
create policy "read own requests, admins read all" on public.service_requests for select using (requester_id = auth.uid() or public.is_admin(auth.uid()));
create policy "admins handle requests" on public.service_requests for update using (public.is_admin(auth.uid()));

-- 4. Student profile visibility: a public page only exists if the person turned it on.
create function public.public_profile(uid uuid) returns table (name text, bio text, grade_name text, account_type text)
language sql stable security definer set search_path = public as $$
  select public.display_name(u.name), u.bio, g.name, u.account_type
  from public.users u left join public.grades g on g.id = u.grade_id
  where u.id = uid and u.visibility = 'public' and auth.uid() is not null
$$;
grant execute on function public.public_profile(uuid) to authenticated;

-- 5. Private storage for tutor documents. Each person can only touch their own folder; admins can read all.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tutor-docs', 'tutor-docs', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "tutors upload own documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'tutor-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "tutors update own documents" on storage.objects for update to authenticated
  using (bucket_id = 'tutor-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "tutors delete own documents" on storage.objects for delete to authenticated
  using (bucket_id = 'tutor-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owners and admins read documents" on storage.objects for select to authenticated
  using (bucket_id = 'tutor-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin(auth.uid())));

-- ============================================================ 0014_tutor_directory_switch
-- A switch for the public tutor directory. Off by default: only admins see tutors until you turn it on.
create table public.site_settings (key text primary key, value text not null);
alter table public.site_settings enable row level security;
create policy "anyone reads settings" on public.site_settings for select using (true);
create policy "admins change settings" on public.site_settings for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
insert into public.site_settings (key, value) values ('tutor_directory_public', 'false');

create or replace function public.tutor_directory()
returns table (user_id uuid, name text, city text, subjects text[], levels text[], languages text[], mode text, rate int, experience_years int, education text, recommended boolean)
language sql stable security definer set search_path = public as $$
  select t.user_id, public.display_name(u.name), t.city, t.subjects, t.levels, t.languages, t.mode, t.rate, t.experience_years, t.education, t.recommended
  from public.tutor_profiles t join public.users u on u.id = t.user_id
  where t.status = 'verified' and t.visible
    and (public.is_admin(auth.uid()) or exists (select 1 from public.site_settings s where s.key = 'tutor_directory_public' and s.value = 'true'))
  order by t.recommended desc, t.verified_at desc
$$;
create or replace function public.tutor_public(uid uuid)
returns table (user_id uuid, name text, city text, subjects text[], levels text[], languages text[], mode text, rate int, experience_years int, education text, field_of_study text, bio text, availability text, recommended boolean)
language sql stable security definer set search_path = public as $$
  select t.user_id, public.display_name(u.name), t.city, t.subjects, t.levels, t.languages, t.mode, t.rate, t.experience_years, t.education, t.field_of_study, t.bio, t.availability, t.recommended
  from public.tutor_profiles t join public.users u on u.id = t.user_id
  where t.user_id = uid and t.status = 'verified' and t.visible
    and (public.is_admin(auth.uid()) or exists (select 1 from public.site_settings s where s.key = 'tutor_directory_public' and s.value = 'true'))
$$;
