-- ============================================================================
-- Row Level Security — SRS §14.4 (API/data access pattern) and §18 (Security)
--
-- Rule of thumb:
--   * Content tables (grades, subjects, topics, categories, courses, lessons,
--     quizzes, questions, question_options) -> public SELECT, no public writes.
--   * User-owned tables (users, progress, quiz_attempts) -> a user can only
--     read/write their OWN rows.
--   * At MVP, content writes are done via the Supabase dashboard using the
--     service role (which bypasses RLS), so no INSERT/UPDATE/DELETE policies
--     are defined for anon/authenticated on content tables — this is
--     intentional per §16.1 ("no custom admin UI" at MVP).
-- ============================================================================

alter table public.users enable row level security;
alter table public.grades enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.categories enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.progress enable row level security;
alter table public.quiz_attempts enable row level security;

-- ---------------------------------------------------------------------------
-- Content tables: public read-only
-- ---------------------------------------------------------------------------
create policy "public read grades" on public.grades for select using (true);
create policy "public read subjects" on public.subjects for select using (true);
create policy "public read topics" on public.topics for select using (true);
create policy "public read categories" on public.categories for select using (true);
create policy "public read courses" on public.courses for select using (true);
create policy "public read lessons" on public.lessons for select using (true);
create policy "public read quizzes" on public.quizzes for select using (true);
create policy "public read questions" on public.questions for select using (true);
create policy "public read question_options" on public.question_options for select using (true);

-- ---------------------------------------------------------------------------
-- users: a user can read & update only their own profile row
-- ---------------------------------------------------------------------------
create policy "users read own profile" on public.users
  for select using (auth.uid() = id);

create policy "users update own profile" on public.users
  for update using (auth.uid() = id);

create policy "users insert own profile" on public.users
  for insert with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- progress: private read/write, own rows only
-- ---------------------------------------------------------------------------
create policy "progress select own" on public.progress
  for select using (auth.uid() = user_id);

create policy "progress insert own" on public.progress
  for insert with check (auth.uid() = user_id);

create policy "progress update own" on public.progress
  for update using (auth.uid() = user_id);

create policy "progress delete own" on public.progress
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- quiz_attempts: private read/write, own rows only
-- ---------------------------------------------------------------------------
create policy "quiz_attempts select own" on public.quiz_attempts
  for select using (auth.uid() = user_id);

create policy "quiz_attempts insert own" on public.quiz_attempts
  for insert with check (auth.uid() = user_id);
