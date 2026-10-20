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
