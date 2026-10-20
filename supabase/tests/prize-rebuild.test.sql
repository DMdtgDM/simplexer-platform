-- Prize rebuild tests — run locally with psql on a SCRATCH database:
--   psql -d scratchdb -f supabase/tests/prize-rebuild.test.sql
-- Phase 1 loads the OLD winner functions and proves the 3 reported bugs.
-- The file then applies ../migrations/0023_prize_rebuild.sql itself and
-- Phase 2 asserts the fixed behaviour. Do NOT run on a real database.

-- Harness: minimal faithful schema for the winner functions + stubs.
-- The function bodies for the OLD replace_winner (0017) and the 0022
-- disqualify are copied verbatim from the migrations. Migration 0023 is
-- loaded from the real project file.
\set QUIET on
\pset pager off

create schema if not exists private;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;

create table public.users (id uuid primary key, name text not null, notify_competitions boolean default true);
create table public.competitions (id uuid primary key, prize_1 text not null default '', prize_2 text not null default '', prize_3 text not null default '', status text not null default 'finalized');
create table public.competition_attempts (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null, user_id uuid not null,
  score int not null, total int not null, duration_seconds int not null,
  submitted_at timestamptz, disqualified boolean not null default false, dq_reason text);
create table public.competition_winners (
  competition_id uuid not null, rank int not null, user_id uuid not null,
  name text not null default '', prize text not null default '', phone text not null default '',
  paid boolean not null default false, paid_at timestamptz,
  payment_ref text not null default '', verified boolean not null default false,
  primary key (competition_id, rank));

create table public.test_notifications (op text, user_id uuid, rank int);
create or replace function public.test_notify() returns trigger
language plpgsql as $$
begin
  insert into public.test_notifications values (tg_op, coalesce(new.user_id, old.user_id), coalesce(new.rank, old.rank));
  return coalesce(new, old);
end $$;
create trigger test_notify after insert or update on public.competition_winners
  for each row execute function public.test_notify();

-- permission stub: the logic under test is ranking/rebuild, not access control
create or replace function public.can_manage_competition(comp uuid) returns boolean
language sql as $$ select true $$;

-- ===== OLD competition_replace_winner (0017, verbatim) =====
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

-- ===== 0022 competition_disqualify (verbatim) =====
create or replace function public.competition_disqualify(comp uuid, uid uuid, why text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_competition(comp) then raise exception 'forbidden'; end if;
  update public.competition_attempts
     set disqualified = true, dq_reason = left(coalesce(why, ''), 200)
   where competition_id = comp and user_id = uid;
  delete from public.competition_winners
   where competition_id = comp and user_id = uid;
end $$;

-- ===== seed =====
insert into public.users values
  ('11111111-1111-1111-1111-111111111111','A'),
  ('22222222-2222-2222-2222-222222222222','B'),
  ('33333333-3333-3333-3333-333333333333','C'),
  ('44444444-4444-4444-4444-444444444444','D'),
  ('55555555-5555-5555-5555-555555555555','E');
insert into public.competitions values ('99999999-9999-9999-9999-999999999999','P1','P2','P3','finalized');
insert into public.competition_attempts (competition_id, user_id, score, total, duration_seconds, submitted_at) values
  ('99999999-9999-9999-9999-999999999999','11111111-1111-1111-1111-111111111111',100,10,600,'2026-01-01 10:00'),
  ('99999999-9999-9999-9999-999999999999','22222222-2222-2222-2222-222222222222', 90,10,610,'2026-01-01 10:01'),
  ('99999999-9999-9999-9999-999999999999','33333333-3333-3333-3333-333333333333', 80,10,620,'2026-01-01 10:02'),
  ('99999999-9999-9999-9999-999999999999','44444444-4444-4444-4444-444444444444', 70,10,630,'2026-01-01 10:03'),
  ('99999999-9999-9999-9999-999999999999','55555555-5555-5555-5555-555555555555', 60,10,640,'2026-01-01 10:04');

create or replace function public.test_reset() returns void language plpgsql as $$
begin
  delete from public.competition_winners;
  delete from public.test_notifications;
  update public.competition_attempts set disqualified = false, dq_reason = null;
  insert into public.competition_winners (competition_id, rank, user_id, name, prize) values
    ('99999999-9999-9999-9999-999999999999',1,'11111111-1111-1111-1111-111111111111','A','P1'),
    ('99999999-9999-9999-9999-999999999999',2,'22222222-2222-2222-2222-222222222222','B','P2'),
    ('99999999-9999-9999-9999-999999999999',3,'33333333-3333-3333-3333-333333333333','C','P3');
  delete from public.test_notifications;
end $$;

create or replace function public.winners_str() returns text language sql as $$
  select coalesce(string_agg(name || rank::text, ',' order by rank), 'EMPTY')
  from public.competition_winners where competition_id = '99999999-9999-9999-9999-999999999999' $$;

create or replace function public.assert_eq(label text, got text, want text) returns void language plpgsql as $$
begin
  if got is distinct from want then
    raise exception 'FAIL %: got [%], want [%]', label, got, want;
  end if;
  raise notice 'PASS %: %', label, got;
end $$;

\echo '--- PHASE 1: reproduce the reported bugs with the OLD code ---'
select public.test_reset();
select public.competition_replace_winner('99999999-9999-9999-9999-999999999999', 1);
select public.assert_eq('OLD replace rank1 (bug = same winners back)', public.winners_str(), 'A1,B2,C3');

select public.test_reset();
select public.competition_disqualify('99999999-9999-9999-9999-999999999999','22222222-2222-2222-2222-222222222222','cheat');
select public.assert_eq('OLD disqualify B (bug = hole at rank 2)', public.winners_str(), 'A1,C3');
-- the reviewer's forced refill: replace on the empty rank 2
select public.competition_replace_winner('99999999-9999-9999-9999-999999999999', 2);
select public.assert_eq('OLD refill rank2 (bug = D jumps over C)', public.winners_str(), 'A1,D2,C3');

\i ../migrations/0023_prize_rebuild.sql
\echo '--- PHASE 2: migration 0023 applied; run the fix scenarios ---'

-- redefine reset now that 0023's table exists (full clean state per scenario)
create or replace function public.test_reset() returns void language plpgsql as $$
begin
  delete from public.competition_winners;
  delete from public.competition_removed_winners;
  delete from public.test_notifications;
  update public.competition_attempts set disqualified = false, dq_reason = null;
  insert into public.competition_winners (competition_id, rank, user_id, name, prize) values
    ('99999999-9999-9999-9999-999999999999',1,'11111111-1111-1111-1111-111111111111','A','P1'),
    ('99999999-9999-9999-9999-999999999999',2,'22222222-2222-2222-2222-222222222222','B','P2'),
    ('99999999-9999-9999-9999-999999999999',3,'33333333-3333-3333-3333-333333333333','C','P3');
  delete from public.test_notifications;
end $$;

-- S1: replace rank 1 -> B,C shift up, D enters at 3, A stays out
select public.test_reset();
delete from public.competition_removed_winners;
select public.competition_replace_winner('99999999-9999-9999-9999-999999999999', 1);
select public.assert_eq('S1 replace rank1 shifts everyone up', public.winners_str(), 'B1,C2,D3');
select public.assert_eq('S1 A recorded as removed',
  (select count(*)::text from public.competition_removed_winners where user_id = '11111111-1111-1111-1111-111111111111'), '1');
select public.assert_eq('S1 only D got a fresh won-notification',
  (select coalesce(string_agg(op || ':' || rank::text, ','), 'NONE') from public.test_notifications where op = 'INSERT'), 'INSERT:3');

-- S2: disqualify B after finalize -> no hole, C and D move up
select public.test_reset();
select public.competition_disqualify('99999999-9999-9999-9999-999999999999','22222222-2222-2222-2222-222222222222','shared answers');
select public.assert_eq('S2 disqualify B closes the hole', public.winners_str(), 'A1,C2,D3');

-- S3: verified/paid state travels with the student when ranks shift
select public.test_reset();
update public.competition_winners set verified = true, payment_ref = 'REF-C' where rank = 3;
update public.competition_winners set paid = true, paid_at = now(), payment_ref = 'REF-B' where rank = 2;
select public.competition_disqualify('99999999-9999-9999-9999-999999999999','11111111-1111-1111-1111-111111111111','cheat');
select public.assert_eq('S3 disqualify A shifts B and C up', public.winners_str(), 'B1,C2,D3');
select public.assert_eq('S3 B keeps paid + ref at rank 1',
  (select (paid and payment_ref = 'REF-B')::text from public.competition_winners where rank = 1), 'true');
select public.assert_eq('S3 C keeps verified + ref at rank 2',
  (select (verified and payment_ref = 'REF-C')::text from public.competition_winners where rank = 2), 'true');

-- S4: a replaced winner must NOT be resurrected by a later rebuild
select public.test_reset();
delete from public.competition_removed_winners;
select public.competition_replace_winner('99999999-9999-9999-9999-999999999999', 1);
select public.competition_disqualify('99999999-9999-9999-9999-999999999999','44444444-4444-4444-4444-444444444444','cheat');
select public.assert_eq('S4 A stays out, E enters at 3', public.winners_str(), 'B1,C2,E3');

-- S5: legacy hole (row deleted by hand, nobody removed) is repaired fairly
select public.test_reset();
delete from public.competition_removed_winners;
delete from public.competition_winners where rank = 2;
select public.competition_replace_winner('99999999-9999-9999-9999-999999999999', 2);
select public.assert_eq('S5 hole repaired, B back at 2 (never removed)', public.winners_str(), 'A1,B2,C3');

-- S6: prizes follow the NEW rank after a shift
select public.test_reset();
select public.competition_disqualify('99999999-9999-9999-9999-999999999999','11111111-1111-1111-1111-111111111111','cheat');
select public.assert_eq('S6 prize labels follow ranks',
  (select string_agg(prize, ',' order by rank) from public.competition_winners), 'P1,P2,P3');

\echo '--- ALL SCENARIOS DONE ---'
