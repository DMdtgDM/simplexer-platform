-- Only admins can post jobs. Teachers apply; everyone else browses.
drop policy if exists "signed-in users post jobs" on public.jobs;
create policy "admins post jobs" on public.jobs
  for insert with check (auth.uid() = poster_id and public.is_admin(auth.uid()));
