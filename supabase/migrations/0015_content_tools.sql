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
