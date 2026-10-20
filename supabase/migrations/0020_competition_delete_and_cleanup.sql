-- 0020 — Competition deletion that actually deletes + legacy cleanup.
--
-- The bug Daniel hit: migration 0012 limited DELETE to competitions whose
-- status is not 'finalized', while the manage page (v11) showed the delete
-- button for every stage. The click silently matched zero rows. Managers
-- (creator or admin) may delete a competition at ANY stage; related rows
-- cascade (questions, entries, attempts, winners, secrets).

drop policy if exists "managers delete unfinished competitions" on public.competitions;
drop policy if exists "managers delete competitions" on public.competitions;
create policy "managers delete competitions" on public.competitions
  for delete using (public.can_manage_competition(id));

-- Legacy columns from the first competition design (0008). Nothing in the
-- current app reads competitions.prize or competitions.quiz_id: prizes live
-- in prize_1/prize_2/prize_3 and each competition owns its questions.
-- Preserve any stray legacy prize text before dropping the column.
update public.competitions
   set prize_1 = prize
 where coalesce(prize_1, '') = '' and coalesce(prize, '') <> '';

alter table public.competitions drop column if exists prize;
alter table public.competitions drop column if exists quiz_id;
