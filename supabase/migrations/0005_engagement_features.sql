-- ============================================================================
-- Engagement features: streaks, bookmarks, exam countdown, full-text search.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- daily_activity — one row per user per calendar day they did something
-- meaningful (completed a lesson or submitted a quiz). Powers the streak
-- counter on /profile. Logged server-side in lib/actions.ts, never by the
-- client directly.
-- ---------------------------------------------------------------------------
create table public.daily_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  activity_date date not null default current_date,
  unique (user_id, activity_date)
);

create index daily_activity_user_idx on public.daily_activity (user_id, activity_date desc);

alter table public.daily_activity enable row level security;

create policy "daily_activity select own" on public.daily_activity
  for select using (auth.uid() = user_id);

create policy "daily_activity insert own" on public.daily_activity
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- bookmarks — "save for later", one row per user per lesson.
-- ---------------------------------------------------------------------------
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index bookmarks_user_idx on public.bookmarks (user_id, created_at desc);

alter table public.bookmarks enable row level security;

create policy "bookmarks select own" on public.bookmarks
  for select using (auth.uid() = user_id);

create policy "bookmarks insert own" on public.bookmarks
  for insert with check (auth.uid() = user_id);

create policy "bookmarks delete own" on public.bookmarks
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- exam countdown — nullable date on grades. Only Grade 10 / Grade 12 rows
-- (the ones already tagged "National Exam Prep") are expected to have this
-- set, but it works for any grade. Left null = no banner shown.
-- ---------------------------------------------------------------------------
alter table public.grades add column exam_date date;

-- ---------------------------------------------------------------------------
-- Full-text search — replaces the bare ilike-on-title-only search.
-- Generated tsvector columns (title weighted higher than body) + GIN
-- indexes, so /search can match on lesson content and course descriptions
-- too, not just titles.
-- ---------------------------------------------------------------------------
alter table public.lessons
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) stored;

create index lessons_search_idx on public.lessons using gin (search_vector);

alter table public.courses
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored;

create index courses_search_idx on public.courses using gin (search_vector);
