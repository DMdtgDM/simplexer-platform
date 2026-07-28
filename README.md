# Simplexer Learning Platform

Bilingual (Amharic/English) learning platform for Ethiopia — built per the
Simplexer SRS: Next.js (App Router) + Tailwind CSS + Supabase (Postgres,
Auth, Storage) + KaTeX, deployable to Vercel.

This repo is the Phase 1 MVP: the full Formal Track / Interest Track
navigation and page set, real auth, real DB-backed progress and quizzes, and
one fully-populated vertical slice (Grade 11 Physics → Kinematics, and the
Intro to Python interest course) so the site is usable out of the box.

## 1. Supabase project setup

1. Create a new project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the six migration files **in order** from
   `supabase/migrations/`:
   - `0001_schema.sql` — tables, constraints, indexes, the new-user trigger
   - `0002_rls_policies.sql` — Row Level Security policies
   - `0003_seed_data.sql` — the Kinematics + Intro to Python vertical slice
   - `0004_content_workflow.sql` — user roles + teacher course submission /
     admin review queue (see "Teacher & Admin workflow" below)
   - `0005_engagement_features.sql` — streaks, bookmarks, exam countdown,
     and full-text search (see "Engagement features" below)
   - `0006_teacher_assignments_and_links.sql` — Formal Track teacher
     assignments, full teacher edit/delete rights, and admin-managed
     community links (see "Formal Track teacher submissions" and
     "Community & resources" below)
   (If you have the Supabase CLI linked to the project instead, `supabase db push` runs all six automatically.)
3. In **Authentication → Providers**, enable **Email** (should be on by
   default) and **Google**. For Google, you'll need a Google Cloud OAuth
   client — add `https://<your-project-ref>.supabase.co/auth/v1/callback`
   as an authorized redirect URI there, and paste the client ID/secret into
   Supabase's Google provider settings.
4. In **Authentication → URL Configuration**, add your site URL (e.g.
   `https://your-app.vercel.app`) and `http://localhost:3000` to the
   allowed redirect URLs, so `/auth/callback` works in both environments.
5. Copy your **Project URL** and **anon public key** from
   **Project Settings → API** — you'll need them next.

## 2. Local setup

```bash
npm install
cp .env.local.example .env.local
# edit .env.local and paste in your Supabase URL + anon key
npm run dev
```

Visit `http://localhost:3000`.

## 3. Deploying to Vercel

1. Push this repo to GitHub.
2. Import it into [Vercel](https://vercel.com/new).
3. Add the same three environment variables from `.env.local` in the
   Vercel project's **Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` → your Vercel deployment URL
4. Deploy. Vercel auto-detects Next.js — no build config needed.
5. Go back to Supabase's Auth URL settings and make sure your production
   Vercel URL is in the allowed redirect list (step 4 above).

## Project structure

```
app/                       Next.js App Router pages (see SRS §7 sitemap)
  formal/[grade]/[subject]/[topic]/   Formal Track drill-down
  interests/[category]/[course]/     Interest Track drill-down
  lesson/[lessonId]/                 Lesson page (shared by both tracks)
  quiz/[quizId]/(results)/           Quiz taking + results
  login/, signup/, auth/callback/    Auth
  profile/(progress)/                User dashboard
components/                Shared UI (Navbar, BottomNav, Card, Button, quiz UI,
                            KaTeX/markdown renderer, click-to-load YouTube embed)
lib/
  supabase/                 Browser + server Supabase clients
  queries/                  All data-fetching, grouped by entity
  i18n/                     EN/AM UI-chrome dictionary + provider
  actions.ts                Server actions: mark-lesson-complete, submit-quiz
  types.ts                  TypeScript types matching the DB schema
supabase/migrations/        The 3 SQL files described above
```

## Teacher & Admin workflow

After running `0004_content_workflow.sql`, every user has a `role`:
`student` (default), `teacher`, or `admin`. This gates two extra pages:

- **`/teach`** — visible to `teacher`/`admin` accounts. Lets someone submit
  an Interest Track course (title, description, difficulty, and one or more
  lessons), and — if the admin has assigned them a subject — submit
  individual Formal Track lessons too (see below). Everything is saved as
  `status = 'pending'` and is **not publicly visible** until approved — Row
  Level Security enforces this at the database level, not just in the UI.
  Teachers can also **edit or delete** their own submissions from this page
  at any time, whether pending, approved, or rejected.
- **`/admin`** — visible to `admin` accounts only. Has five tabs:
  - **Course Queue** — preview each pending Interest Track course's lessons,
    then Approve (publishes it immediately) or Reject (with a reason the
    teacher can see on `/teach`).
  - **Lesson Queue** — same idea, but for individually-submitted Formal
    Track lessons (see below).
  - **Assignments** — grant a teacher permission to submit lessons into a
    specific grade + subject (e.g. "Selam can teach Grade 11 Physics").
  - **Links** — manage the Discord/Telegram/resource links shown on the
    public `/community` page.
  - **Users** — change any user's role via a dropdown. This is how you
    promote someone to `teacher` (no self-request flow, by design — an
    admin manually grants it), and it's also where you find teachers to
    assign a subject to in the Assignments tab.

**To make yourself an admin the first time**, run this in the Supabase SQL
Editor after you've signed up through the app once:

```sql
update public.users set role = 'admin' where email = 'you@example.com';
```

After that, you'll see "Teach" and "Admin" links in the navbar, and can
promote other users and assign subjects from `/admin` instead of writing
SQL again.

### Formal Track teacher submissions

Run `0006_teacher_assignments_and_links.sql` to enable this (see migration
list above). Once it's in:

1. Go to `/admin` → **Assignments**, pick a teacher, a grade, and a
   subject, and click Assign.
2. That teacher now sees a "Formal Track" box on their `/teach` page
   listing the subject(s) they're assigned to. They pick an existing topic
   within that subject and submit a lesson (title, markdown content,
   optional YouTube URL) — they can't create new topics, only add lessons
   into ones you've already set up.
3. The submission shows up in `/admin` → **Lesson Queue** for you to
   approve or reject, same as Interest Track courses.
4. Approved lessons appear in the normal topic lesson list alongside the
   ones you added directly via SQL/Table Editor — students can't tell the
   difference.

A teacher's own pending/rejected lessons are visible only to them (and
admins) until approved — everyone else only ever sees `status = 'approved'`
content, enforced by RLS.

### Editing and deleting content

Both course-based (Interest Track) and topic-based (Formal Track) content a
teacher submitted can be edited or deleted by that teacher at any time from
`/teach`:

- **Deleting** removes the course/lesson immediately (and, for a course,
  all its lessons via cascade) — there's a confirmation prompt first, and
  it can't be undone.
- **Editing** an approved course automatically resets its `status` back to
  `'pending'`, so a change never goes live without you seeing it again in
  the review queue first. Editing a pending/rejected course just updates it
  in place.

Admins can edit or delete **any** course or lesson regardless of who
submitted it, for moderation/cleanup — this is enforced via a
`public.is_admin()` policy, not just hidden buttons in the UI.

## Community & resources (`/community`)

Run `0006_teacher_assignments_and_links.sql` to enable this. The old
`/telegram` page now redirects to `/community`, which renders a list of
links pulled from the `community_links` table instead of a single hardcoded
Telegram URL. Manage it from `/admin` → **Links**:

- Add a label, a URL, and pick an icon (Telegram-style, Discord-style,
  generic link, YouTube, or resource/book).
- Your existing Telegram link is seeded automatically by the migration —
  add your Discord invite (or any other link) the same way once you have
  one.
- Links appear on `/community` in the order they were added; delete any
  link from the same admin tab.

## Appearance: Light / Dark / System theme

No migration needed — this is entirely client-side. Go to `/settings` (also
linked from `/profile`) to choose **Light**, **Dark**, or **System**
(follows the visitor's OS setting automatically). The choice is saved to
that browser's `localStorage` and applied instantly with no flash of the
wrong theme on reload. There's also a quick-access toggle in the footer on
every page.

Implementation note: dark mode is applied via a `.dark` class on `<html>`
plus a set of global CSS overrides in `app/globals.css` (rather than
`dark:` variants hand-added to every single page), so coverage is broad and
consistent but not pixel-perfect on every screen. If something looks off in
dark mode on a specific page, it's a quick, contained CSS fix.

## Engagement features (added on top of the original MVP)

After running `0005_engagement_features.sql`:

- **Daily streaks** — completing a lesson or submitting a quiz logs a row in
  `daily_activity`. `/profile` shows the current streak (and best streak, if
  higher) computed from that table — no cron job needed.
- **Bookmarks / "save for later"** — the bookmark icon on any lesson page
  saves it to `/profile/bookmarks`.
- **Exam countdown banner** — set a date on a grade and a "N days until the
  exam" banner appears on that grade's page and on `/profile` for students
  in that grade:
  ```sql
  update public.grades set exam_date = '2027-06-15' where slug = 'grade-12';
  ```
  Leave `exam_date` null (the default) and the banner simply doesn't render.
- **Full-text search** — `/search` now matches lesson content (not just
  titles) and approved Interest Track courses, using Postgres
  `tsvector`/`websearch_to_tsquery` instead of a bare `ilike`.
- **Cross-topic "what's next"** — when a student finishes the last lesson in
  a Formal Track topic, the lesson page suggests the first lesson of the
  next topic in that subject instead of showing a dead-end "Next" button.
- **Course cover images** — the `/teach` form has an optional "cover image
  URL" field (paste a link — no Supabase Storage upload widget yet, to keep
  scope small); it renders on the course card and course overview page.
- **Teacher analytics** — `/teach` shows "N students started · M finished"
  under each of your own **approved** courses.
- **Ask on Telegram** — every lesson page links to the Telegram channel as a
  lightweight stand-in for a full comment system.

### Deliberately not added (and why)

- **Leaderboards** — genuinely risky for the group of students who'd rank
  low; doing it right (e.g. "most improved" instead of raw rank) is a
  design problem worth its own pass, not a quick add.
- **In-lesson comment threads** — a real comment system (moderation, spam,
  notifications) is a bigger build than it looks; the Telegram link covers
  the same need for now.
- **Referral tracking, payments (Telebirr/Chapa), push notifications** —
  all reasonable roadmap items, but each is a standalone project (payment
  provider integration, PWA service worker, etc.), not something to bolt
  on alongside everything else here.
- **Blogs** — not built yet. Worth adding if you want a place for
  announcements/study tips outside of Telegram/Discord; it'd follow the
  same admin-review pattern as courses (`status`, RLS, an admin tab) if
  you want teachers to contribute posts too, or just an admin-only
  `posts` table if you're the only author. Ask and I'll build it next.

- **Localization (§17):** implemented as a lightweight custom
  React-context dictionary (`lib/i18n`) rather than next-intl, to keep the
  bundle and build surface small for MVP. It satisfies the same
  requirement — a persisted EN/AM toggle for UI chrome only, with lesson
  content staying mixed-language exactly as authored. Swapping to
  next-intl later is a contained change limited to that folder.
- **Admin/content authoring (§16.1):** the original SRS scoped this out of
  Phase 1, but it's since been built — see "Teacher & Admin workflow"
  above. `/admin` now covers course/lesson review, teacher-subject
  assignments, community links, and user roles. What's still SQL/Table
  Editor-only: creating new **grades, subjects, topics, and categories**
  themselves (the taxonomy) — teachers add lessons *into* existing ones,
  but the taxonomy is still curriculum-controlled by whoever has Supabase
  dashboard access. Same for quizzes — teachers submit lessons, not
  quizzes, so add those manually if a teacher-submitted lesson needs one.
- **Performance (§13.1):** YouTube embeds render a thumbnail + play button
  and only load the iframe (and its JS/video payload) on tap. Images use
  `next/image`-compatible remote patterns. Content pages are statically
  revalidated (ISR) so repeat visits are served from cache.
