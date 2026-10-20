-- SIMPLEXER UPGRADE FROM v10: run ONCE in the Supabase SQL editor.
-- Applies 0015 (skips anything that already exists), then 0016 and 0017.

-- ============================================================ 0015_content_tools
-- Content tools: drafts, richer lessons, admin-managed grades/subjects/topics/categories,
-- teacher-owned quizzes, and a public bucket for cover images and lesson files.

-- 1. Teachers can keep unfinished courses as drafts (admin queue only lists 'pending').
alter type public.course_status add value if not exists 'draft';

create or replace function public.guard_course_status() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    if new.status::text = 'draft' and (tg_op = 'INSERT' or old.status::text = 'draft') then
      null; -- an unfinished course stays the teacher's own draft
    else
      new.status := 'pending'; -- submitting, or editing something already submitted, always goes to review
    end if;
  end if;
  return new;
end $$;

-- 2. Reading style per lesson, and course language / tags.
alter table public.lessons
  add column if not exists font text not null default 'sans' check (font in ('sans', 'serif', 'ethiopic', 'mono')),
  add column if not exists text_size text not null default 'md' check (text_size in ('sm', 'md', 'lg'));
alter table public.courses
  add column if not exists language text not null default 'Amharic' check (language in ('Amharic', 'English', 'Both')),
  add column if not exists tags text[] not null default '{}';

-- 3. Admins manage the structure from the app (no more SQL for a new grade or subject).
create policy "admins manage grades" on public.grades for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "admins manage subjects" on public.subjects for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "admins manage topics" on public.topics for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "admins manage categories" on public.categories for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- 4. Whoever owns a lesson (its teacher, or an admin) can manage that lesson's quiz.
create function public.owns_lesson(lid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin(auth.uid()) or exists (
    select 1 from public.lessons l left join public.courses c on c.id = l.course_id
    where l.id = lid and (l.submitted_by = auth.uid() or c.submitted_by = auth.uid()))
$$;
create policy "owners manage quizzes" on public.quizzes for all
  using (public.owns_lesson(lesson_id)) with check (public.owns_lesson(lesson_id));
create policy "owners manage questions" on public.questions for all
  using (exists (select 1 from public.quizzes q where q.id = quiz_id and public.owns_lesson(q.lesson_id)))
  with check (exists (select 1 from public.quizzes q where q.id = quiz_id and public.owns_lesson(q.lesson_id)));
create policy "owners manage question options" on public.question_options for all
  using (exists (select 1 from public.questions s join public.quizzes q on q.id = s.quiz_id where s.id = question_id and public.owns_lesson(q.lesson_id)))
  with check (exists (select 1 from public.questions s join public.quizzes q on q.id = s.quiz_id where s.id = question_id and public.owns_lesson(q.lesson_id)));

-- 5. Public bucket for cover images and lesson files (PDF). Teachers write only inside their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-media', 'course-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
create policy "teachers upload course media" on storage.objects for insert to authenticated
  with check (bucket_id = 'course-media' and (storage.foldername(name))[1] = auth.uid()::text and public.is_teacher_or_admin(auth.uid()));
create policy "teachers delete own course media" on storage.objects for delete to authenticated
  using (bucket_id = 'course-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "anyone reads course media" on storage.objects for select using (bucket_id = 'course-media');


-- ============================================================ 0016_notes_fixes
-- 0016 — Daniel's notes fixes (15 Oct 2026)
-- Jobs: parent contact phone + gender preference. Tutors: gender (for matching).
-- Questions: not only multiple choice. Winners: payment reference + verification,
-- and a promote-next function when a winner is removed/disqualified.

-- ---------------------------------------------------------------------------
-- Jobs / requests: contact phone so admin can actually reach the parent
-- ---------------------------------------------------------------------------
alter table public.jobs
  add column if not exists contact_phone text not null default '',
  add column if not exists gender_pref text not null default 'any'
    check (gender_pref in ('any', 'male', 'female'));

alter table public.service_requests
  add column if not exists contact_phone text not null default '',
  add column if not exists gender_pref text not null default 'any'
    check (gender_pref in ('any', 'male', 'female'));

-- ---------------------------------------------------------------------------
-- Tutor gender — used only to match a parent's stated preference on a job
-- ---------------------------------------------------------------------------
alter table public.tutor_profiles
  add column if not exists gender text check (gender in ('male', 'female'));

-- ---------------------------------------------------------------------------
-- Questions: multiple choice is no longer the only kind
--   multiple_choice — options, one correct (unchanged behaviour)
--   true_false      — stored as two options (True / False), one correct
--   short_answer    — no options; `correct_text` holds the accepted answer
--                     (grading compares trimmed, case-insensitive text;
--                     separate alternatives with | )
-- ---------------------------------------------------------------------------
alter table public.questions
  add column if not exists question_type text not null default 'multiple_choice'
    check (question_type in ('multiple_choice', 'true_false', 'short_answer')),
  add column if not exists correct_text text;

-- A pass mark nobody can reach (or below zero) is a data bug, not a setting.
do $$ begin
  alter table public.quizzes
    add constraint quizzes_pass_threshold_range check (pass_threshold between 0 and 100);
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Winners: record HOW a prize was paid, and require verification first.
-- "Verified" = an admin/manager confirmed this winner is a real student of
-- the platform (account + phone checked), per Daniel's note — not just a
-- phone number typed into a form.
-- ---------------------------------------------------------------------------
alter table public.competition_winners
  add column if not exists payment_ref text not null default '',
  add column if not exists verified boolean not null default false;

-- Replace the winner at rank `rnk` with the next eligible student:
-- highest score, then fastest time, then earliest submission; disqualified
-- attempts and students who already hold another rank are skipped, so the
-- prize moves down the ranking exactly once per call.
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
   order by a.score desc, a.duration_seconds asc, a.submitted_at asc
   limit 1;

  if cand is not null then
    insert into public.competition_winners (competition_id, rank, user_id, name, prize)
    values (comp, rnk, cand.user_id, cand.name,
            case rnk when 1 then c.prize_1 when 2 then c.prize_2 else c.prize_3 end);
  end if;
end $$;

grant execute on function public.competition_replace_winner(uuid, int) to authenticated;


-- ============================================================ 0017_better_ranking
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
