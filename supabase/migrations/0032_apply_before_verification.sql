-- 0032 — Apply first, verify after (Daniel's call, 2026-11-25).
--
-- Until now a tutor had to wait for admin verification before they could
-- apply to any job, which stalled every new tutor. Now a tutor who has
-- SUBMITTED their application (tutor_profiles.status = 'pending') may
-- apply to open jobs right away; verification still happens before a
-- match is final — the admin sees a "Not verified yet" badge on pending
-- applicants on the job page, and the applicant's name there links to
-- their full review page. Suspended and rejected tutors still cannot
-- apply, and the gender-preference check from 0022 is unchanged.
drop policy if exists "verified tutors and teachers apply to open jobs" on public.job_applications;
create policy "tutors with an application apply to open jobs" on public.job_applications
  for insert with check (
    auth.uid() = applicant_id
    and (public.is_teacher_or_admin(auth.uid())
         or exists (select 1 from public.tutor_profiles t
                     where t.user_id = auth.uid() and t.status in ('pending', 'verified')))
    and exists (
      select 1 from public.jobs j
       where j.id = job_id and j.status = 'open'
         and (coalesce(j.gender_pref, 'any') = 'any'
              or public.is_admin(auth.uid())
              or exists (select 1 from public.tutor_profiles t2
                          where t2.user_id = auth.uid() and t2.gender = j.gender_pref))
    )
  );
