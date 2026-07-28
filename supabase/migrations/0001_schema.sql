-- ============================================================================
-- Simplexer Learning Platform — Initial Schema
-- Matches SRS §11 Data Model
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- users (extends Supabase auth.users with app-specific profile fields)
-- ---------------------------------------------------------------------------
create type level_type as enum ('grade', 'interest_only');

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text,
  phone text,
  level_type level_type not null default 'interest_only',
  grade_id uuid, -- FK added after grades table is created
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- grades (Formal Track top level)
-- ---------------------------------------------------------------------------
create table public.grades (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  tag text, -- e.g. "National Exam Prep"
  "order" int not null default 0
);

alter table public.users
  add constraint users_grade_id_fkey foreign key (grade_id) references public.grades (id) on delete set null;

-- ---------------------------------------------------------------------------
-- subjects (belongs to a grade)
-- ---------------------------------------------------------------------------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  grade_id uuid not null references public.grades (id) on delete cascade,
  name text not null,
  slug text not null,
  icon text,
  "order" int not null default 0,
  unique (grade_id, slug)
);

-- ---------------------------------------------------------------------------
-- topics (belongs to a subject)
-- ---------------------------------------------------------------------------
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  "order" int not null default 0,
  unique (subject_id, slug)
);

-- ---------------------------------------------------------------------------
-- categories (Interest Track top level)
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  "order" int not null default 0
);

-- ---------------------------------------------------------------------------
-- courses (belongs to a category)
-- ---------------------------------------------------------------------------
create type course_difficulty as enum ('beginner', 'intermediate', 'advanced');

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  difficulty course_difficulty not null default 'beginner',
  cover_image_url text,
  instructor text,
  "order" int not null default 0,
  unique (category_id, slug)
);

-- ---------------------------------------------------------------------------
-- lessons (belongs to EITHER a topic (Formal) OR a course (Interest))
-- ---------------------------------------------------------------------------
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics (id) on delete cascade,
  course_id uuid references public.courses (id) on delete cascade,
  slug text not null,
  title text not null,
  content text not null default '', -- markdown, may contain $inline$ or $$block$$ LaTeX
  video_url text,
  attachment_url text,
  attachment_size_kb int,
  est_minutes int not null default 5,
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  -- exactly one of topic_id / course_id must be set, never both, never neither
  constraint lessons_exactly_one_parent check (
    (topic_id is not null and course_id is null) or
    (topic_id is null and course_id is not null)
  )
);

create unique index lessons_topic_slug_uidx on public.lessons (topic_id, slug) where topic_id is not null;
create unique index lessons_course_slug_uidx on public.lessons (course_id, slug) where course_id is not null;

-- ---------------------------------------------------------------------------
-- quizzes
-- ---------------------------------------------------------------------------
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons (id) on delete cascade,
  title text not null,
  pass_threshold int not null default 60
);

-- ---------------------------------------------------------------------------
-- questions
-- ---------------------------------------------------------------------------
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  question_text text not null,
  explanation text,
  "order" int not null default 0
);

-- ---------------------------------------------------------------------------
-- question_options
-- ---------------------------------------------------------------------------
create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  "order" int not null default 0
);

-- ---------------------------------------------------------------------------
-- progress (per-user, per-lesson)
-- ---------------------------------------------------------------------------
create table public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (user_id, lesson_id)
);

-- ---------------------------------------------------------------------------
-- quiz_attempts
-- ---------------------------------------------------------------------------
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  score int not null,
  total int not null,
  answers jsonb not null default '{}'::jsonb, -- { question_id: selected_option_id } for the review screen
  attempted_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- helpful indexes
-- ---------------------------------------------------------------------------
create index subjects_grade_idx on public.subjects (grade_id);
create index topics_subject_idx on public.topics (subject_id);
create index courses_category_idx on public.courses (category_id);
create index lessons_topic_idx on public.lessons (topic_id);
create index lessons_course_idx on public.lessons (course_id);
create index questions_quiz_idx on public.questions (quiz_id);
create index question_options_question_idx on public.question_options (question_id);
create index progress_user_idx on public.progress (user_id);
create index quiz_attempts_user_idx on public.quiz_attempts (user_id);
create index quiz_attempts_quiz_idx on public.quiz_attempts (quiz_id);

-- ---------------------------------------------------------------------------
-- auto-create a public.users profile row whenever a new auth user signs up
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name, email, level_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    'interest_only'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
