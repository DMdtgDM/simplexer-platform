-- Paid-winner protection tests — run locally with psql on a SCRATCH db:
--   psql -d scratchdb -f supabase/tests/paid-protection.test.sql
-- Builds a minimal harness, applies migrations 0023 + 0025 from the real
-- project files, then asserts: the unpaid cascade still works, paid
-- winners refuse replace/disqualify, the explicit paid-removal keeps
-- the payment proof in the removal log, and winners get told.
-- Do NOT run on a real database.

\set QUIET on
\pset pager off

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;

-- Scratch setup for the 0025 tests: base tables + stubs, then apply
-- migration 0023, then 0025, then 0025-paid-protection-psql-tests.sql.
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as
$$ select 'f0000000-0000-0000-0000-00000000000f'::uuid $$;

create schema if not exists private;

create table public.users (
  id uuid primary key, name text not null default '',
  role text not null default 'student',
  notify_competitions boolean not null default true
);
create table public.competitions (
  id uuid primary key, title text not null default '',
  prize_1 text not null default '', prize_2 text not null default '', prize_3 text not null default '',
  created_by uuid, status text not null default 'closed'
);
create table public.competition_attempts (
  competition_id uuid not null, user_id uuid not null,
  submitted_at timestamptz, disqualified boolean not null default false,
  dq_reason text not null default '',
  score int not null default 0, total int not null default 10,
  duration_seconds int not null default 100,
  primary key (competition_id, user_id)
);
create table public.competition_winners (
  competition_id uuid not null, rank int not null, user_id uuid not null,
  name text not null default '', prize text not null default '',
  phone text not null default '', verified boolean not null default false,
  paid boolean not null default false, paid_at timestamptz, payment_ref text not null default '',
  primary key (competition_id, rank), unique (competition_id, user_id)
);
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null, kind text not null default '', title text not null default '',
  body text not null default '', href text not null default ''
);

create or replace function public.can_manage_competition(p_comp uuid) returns boolean
language sql stable as $$ select true $$;

create or replace function private.sx_notify(p_user uuid, p_kind text, p_title text, p_body text, p_href text)
returns void language plpgsql as $$
begin
  insert into public.notifications (user_id, kind, title, body, href)
  values (p_user, p_kind, p_title, p_body, p_href);
end $$;

create or replace function test_won_notify() returns trigger language plpgsql as $$
begin
  insert into public.notifications (user_id, kind, title) values (new.user_id, 'prize', 'You won a competition prize');
  return new;
end $$;
create trigger trg_won after insert on public.competition_winners
  for each row execute function test_won_notify();

insert into public.users (id, name, role) values
  ('f0000000-0000-0000-0000-00000000000f', 'Mgr', 'teacher'),
  ('a0000000-0000-0000-0000-00000000000a', 'A', 'student'),
  ('b0000000-0000-0000-0000-00000000000b', 'B', 'student'),
  ('c1000000-0000-0000-0000-00000000000c', 'C', 'student'),
  ('d0000000-0000-0000-0000-00000000000d', 'D', 'student'),
  ('e0000000-0000-0000-0000-00000000000e', 'E', 'student');

insert into public.competitions (id, title, prize_1, prize_2, prize_3, created_by)
values ('c0000000-0000-0000-0000-00000000000c', 'K', '1000', '500', '250', 'f0000000-0000-0000-0000-00000000000f');

insert into public.competition_attempts (competition_id, user_id, submitted_at, score) values
  ('c0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-00000000000a', now(), 100),
  ('c0000000-0000-0000-0000-00000000000c', 'b0000000-0000-0000-0000-00000000000b', now(), 90),
  ('c0000000-0000-0000-0000-00000000000c', 'c1000000-0000-0000-0000-00000000000c', now(), 80),
  ('c0000000-0000-0000-0000-00000000000c', 'd0000000-0000-0000-0000-00000000000d', now(), 70),
  ('c0000000-0000-0000-0000-00000000000c', 'e0000000-0000-0000-0000-00000000000e', now(), 60);

\ir ../migrations/0023_prize_rebuild.sql
\ir ../migrations/0025_paid_winner_protection.sql

-- 0025 tests: run AFTER a scratch setup equivalent to the 0023 harness
-- (users M/A/B/C/D/E, comp K, attempts 100/90/80/70/60, finalize => A1 B2 C3),
-- with migration 0023 applied first and 0025 second. Harness differences:
--   private.sx_notify is a stub that writes into public.notifications;
--   a trigger on winners INSERT writes the "won" notification;
--   auth.uid() returns the manager M.
-- This file only ASSERTS 0025 behaviour.

create temp table notes (who text, title text);
create or replace function test_reset() returns void language plpgsql as $$
begin
  update public.competition_attempts set disqualified = false, dq_reason = '';
  delete from public.competition_winners;
  delete from public.competition_removed_winners;
  delete from public.competition_winner_removals;
  insert into public.competition_winners (competition_id, rank, user_id, name, prize, phone)
  values ('c0000000-0000-0000-0000-00000000000c', 1, 'a0000000-0000-0000-0000-00000000000a', 'A', '1000', '0911'),
         ('c0000000-0000-0000-0000-00000000000c', 2, 'b0000000-0000-0000-0000-00000000000b', 'B', '500', ''),
         ('c0000000-0000-0000-0000-00000000000c', 3, 'c1000000-0000-0000-0000-00000000000c', 'C', '250', '0933');
  truncate notes;
  delete from public.notifications;
end $$;

create or replace function test_snap() returns void language plpgsql as $$
begin
  insert into notes select u.name, n.title from public.notifications n join public.users u on u.id = n.user_id;
end $$;

create or replace function tcheck(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond then raise notice 'PASS: %', label;
  else raise exception 'FAIL: %', label; end if;
end $$;

-- T1: unpaid cascade still works + notifications + log
select test_reset();
select public.competition_replace_winner('c0000000-0000-0000-0000-00000000000c', 1);
select test_snap();
select tcheck((select string_agg(rank || ':' || name, ' ' order by rank) from public.competition_winners) = '1:B 2:C 3:D', 'T1 cascade B1 C2 D3');
select tcheck((select count(*) from notes where who = 'A' and title like '%removed%') = 1, 'T1 A got removal message');
select tcheck((select count(*) from notes where who = 'B' and title like '%changed%') = 1, 'T1 B got rank-change message');
select tcheck((select count(*) from notes where who = 'C' and title like '%changed%') = 1, 'T1 C got rank-change message');
select tcheck((select count(*) from notes where who = 'D' and title like 'You won%') = 1, 'T1 D got won message');
select tcheck((select count(*) from public.competition_winner_removals where user_name = 'A' and was_paid = false and reason = 'Replaced by organiser' and removed_by_name = 'Mgr') = 1, 'T1 removal log row for A');

-- T2: disqualify a PAID winner is refused, nothing changes
select test_reset();
update public.competition_winners set paid = true, paid_at = now(), payment_ref = 'T-3', verified = true
 where competition_id = 'c0000000-0000-0000-0000-00000000000c' and rank = 3;
do $$
begin
  begin
    perform public.competition_disqualify('c0000000-0000-0000-0000-00000000000c', 'c1000000-0000-0000-0000-00000000000c', 'cheated');
    raise exception 'no error raised';
  exception when others then
    if sqlerrm <> 'winner_already_paid' then raise; end if;
  end;
end $$;
select tcheck((select paid and payment_ref = 'T-3' from public.competition_winners where rank = 3), 'T2 paid row intact after refused disqualify');
select tcheck(not (select disqualified from public.competition_attempts where user_id = 'c1000000-0000-0000-0000-00000000000c'), 'T2 attempt not disqualified');
select tcheck((select count(*) from public.competition_winner_removals) = 0, 'T2 no log rows');

-- T3: replace a PAID winner is refused too
do $$
begin
  begin
    perform public.competition_replace_winner('c0000000-0000-0000-0000-00000000000c', 3);
    raise exception 'no error raised';
  exception when others then
    if sqlerrm <> 'winner_already_paid' then raise; end if;
  end;
end $$;
select tcheck((select string_agg(rank || ':' || name, ' ' order by rank) from public.competition_winners) = '1:A 2:B 3:C', 'T3 winners unchanged');

-- T4: the override works, demands a reason, logs paid proof
do $$
begin
  begin
    perform public.competition_remove_paid_winner('c0000000-0000-0000-0000-00000000000c', 'c1000000-0000-0000-0000-00000000000c', '  ');
    raise exception 'no error raised';
  exception when others then
    if sqlerrm <> 'reason_required' then raise; end if;
  end;
end $$;
select public.competition_remove_paid_winner('c0000000-0000-0000-0000-00000000000c', 'c1000000-0000-0000-0000-00000000000c', 'fake results');
select tcheck((select string_agg(rank || ':' || name, ' ' order by rank) from public.competition_winners) = '1:A 2:B 3:D', 'T4 cascade after paid removal A1 B2 D3');
select tcheck((select count(*) from public.competition_winner_removals
               where user_name = 'C' and was_paid and payment_ref = 'T-3' and reason like 'Paid winner removed after payment%') = 1,
             'T4 log keeps paid proof + reason');
select tcheck((select disqualified from public.competition_attempts where user_id = 'c1000000-0000-0000-0000-00000000000c'), 'T4 attempt disqualified');
select test_snap();
select tcheck((select count(*) from notes where who = 'C' and title like '%removed%') = 1, 'T4 C got removal message');

-- T5: override refuses a non-paid winner
do $$
begin
  begin
    perform public.competition_remove_paid_winner('c0000000-0000-0000-0000-00000000000c', 'b0000000-0000-0000-0000-00000000000b', 'whatever');
    raise exception 'no error raised';
  exception when others then
    if sqlerrm <> 'not_paid' then raise; end if;
  end;
end $$;

-- T6: the removed paid winner stays out on later actions
select public.competition_replace_winner('c0000000-0000-0000-0000-00000000000c', 1);
select tcheck((select string_agg(rank || ':' || name, ' ' order by rank) from public.competition_winners) = '1:B 2:D 3:E', 'T6 cascade B1 D2 E3, C stays out');
select tcheck((select count(*) from public.competition_winner_removals where user_name = 'C') = 1, 'T6 exactly one log row for C');

select 'ALL 0025 TESTS DONE' as result;
