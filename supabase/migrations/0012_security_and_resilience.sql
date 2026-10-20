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
