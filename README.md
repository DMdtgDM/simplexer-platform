# Simplexer Learning Platform

## v14 — Next.js 16 + React 19 (Oct 2026)
- **Framework upgrade only — no database step.** Next.js 14.2.35 → 16.4.2 and React 18 → 19.3.1 (with `@types/react` 19, `eslint-config-next` 16, `@supabase/ssr` 0.12.7). Nothing under `supabase/` changed: no migration, no RUN file, nothing to run in the SQL editor. Deploy this code onto the database exactly as v13.5.1 left it.
- **What the upgrade required in code:** request APIs are async-only in Next 16, so every page now awaits `params`/`searchParams`, and the Supabase server client factory and the server translator are async (`await createClient()`, `await serverT()` at all ~97 call sites). `middleware.ts` became `proxy.ts` (same session-refresh logic, same matcher). `next lint` was removed by Next 16, so the lint script runs the ESLint CLI with a flat config (`eslint.config.mjs`); the React Compiler lint rules the new config enables by default are switched off there — this app does not use the React Compiler, and those rules only flagged patterns that were lint-clean before. The KaTeX stylesheet moved from a CSS `@import` (which Turbopack rejects after other rules) to a normal import in the root layout, in the same cascade position.
- **Verified before shipping:** type-check clean, 12/12 unit tests (including the 697-key EN/AM dictionary parity), lint 0 errors, production (Turbopack) build green, and the built site served locally with home, login, jobs and competitions pages rendering and `/icon.png`, `/favicon.ico`, `/apple-icon.png` answering 200.
- **Honest limits:** the sandbox has no live Supabase, so real sign-in/session refresh could not be exercised end to end here. After deploying, sign in once (email and Google) and click through a few signed-in pages before announcing the launch — that is the one flow this upgrade touches everywhere (the session proxy + async cookie client) and the only one not proven locally.

## v13.5 — lesson visibility, kinder search, card grids (Oct 2026)
- **Teachers choose who sees each lesson (migration 0026).** The lesson builder gains a "Who can see this lesson" picker: **Everyone (public)** — as today; **Students learning here only (enrolled)** — only students who have started the same course/topic (a progress row is the enrolment record; there is no enrolments table), plus the lesson owner, course owner and admins; **Only me (private)** — owner/course owner/admins only. All existing lessons become public, so nothing changes for published content. Quiz, question and option reads now follow the parent lesson (they were world-readable before, which would have leaked a private lesson's quiz); the answer key stays locked as before. Verified on local PostgreSQL 16: 29 assertions — stranger/anon cannot read a private lesson or its quiz chain, an enrolled student can read an enrolled lesson (course and topic), owners/admins can, public lessons unchanged, and the check-setup probe proves a private lesson is hidden from a logged-out viewer.
- **A lesson's creator can delete it, visibly.** The Teach page lists each school lesson with its own Delete button (confirmation, then a plain success message or the real database error — never silent), and in the builder a saved lesson's delete now happens immediately with the same reporting. Deleting cascades cleanly: quiz, questions, options, answer key, attempts, progress and bookmarks all declare ON DELETE CASCADE. Owner/non-owner delete behaviour is covered by the same PG test file (`supabase/tests/lesson-visibility.test.sql`).
- **Logged-out visitors no longer hit a dead end on competitions.** The competitions list and detail pages show a clear "Log in to compete" prompt; login (email and Google) and signup now honour a same-site `next` return path, so the visitor lands back on the competition afterwards. Anonymous competing stays impossible (prize integrity).
- **Jobs and competitions are card grids now**, with a summary strip (total / open / closed on jobs; total / live / upcoming / ended on competitions) and status filter pills (All / Open only / Closed only; All / Live / Upcoming / Ended) carried in the URL. Formal and interest tracks were aligned to the same soft-card system (subject/topic/course grids at 1/2/3 columns, count chips, gradient medallions), and the public tutor profile was rebuilt on the v13.3 gradient-header design — a tutor opening their own public page sees a "This is how families see your profile" banner, and the tutor page links to that exact family view.
- **Search forgives.** Postgres websearch full-text (whole words, stemmer spelling) is replaced by tokenised substring matching: any word — or part of a word — from a lesson title, lesson content, course title/description or subject name finds it, in English and Amharic. Title matches rank first. Empty results now explain themselves in both languages.
- **Amharic round 3:** the teach builder (course + lesson + quiz editors), tutor directory and public profile, teach page, notifications, footer, home samples, competition fee/join texts and the jobs detail notes moved into the dictionary (~260 new keys per language; the parity test keeps both locales exact).
- Database: run `supabase/RUN_FOR_V13_5.sql` (migration 0026) after the v13.4 step, then deploy the code. It is safe to re-run. `check-setup.sql` gained five 0026 rows including the behaviour probe.

## v13.5.1 — quiz gate + browser icon (Oct 2026)
- **Quizzes now respect lesson visibility end to end (migration 0027).** An external review of v13.5 found that `grade_quiz()` / `quiz_review()` — database functions written before visibility existed — never checked it: anyone who learned a private or enrolled-only lesson's quiz id could attempt it and read the review (answers included). Both functions now apply the same access rule as the lesson read policies (owner/admin always; public lessons open; enrolled lessons for members), and blocked attempts write nothing. The 0026 behaviour probe is also no longer callable through the API (it remains available in the SQL editor for `check-setup.sql`). Verified on local PostgreSQL 16: full chain 0001–0027 clean, 0027 twice, attack + legitimate-flow suite (`supabase/tests/quiz-visibility-gate.test.sql`) green, prior suites still green.
- **The site has a browser icon.** `app/icon.png`, `app/favicon.ico` and `app/apple-icon.png` (deep-blue gradient "S" with an amber bar, in the site's own colours) — the tab icon that was missing.
- Database: run `supabase/RUN_FOR_V13_5_1.sql` (migration 0027) after the v13.5 step, then deploy the code. It is safe to re-run. `check-setup.sql` gained two 0027 rows.

## v13.4 — paid winners can't vanish + better signup/sign-in (Oct 2026)
- **A paid winner can no longer be removed by accident (migration 0025).** The round-3 review found the hole in 0023: disqualifying or replacing a winner who was ALREADY PAID deleted their row — paid flag and payment reference destroyed — while the prize cascaded to the next student (double-payment risk). Now the database refuses both actions on a paid winner (`winner_already_paid`, shown on the manage page as a clear message). The genuine "cheating found after payment" case has an explicit door — **Remove paid winner** on the winner's card — which demands a written reason. Every winner who leaves the list, by any path, is snapshotted into the append-only `competition_winner_removals` log (student, rank, prize, phone, verified, paid, payment reference, who, why, when), shown as a **Removal log** on the manage page. Students are told what happened, once each: the removed student gets "your prize was removed", each student whose rank moved gets "you are now rank #N". **Verified on local PostgreSQL 16:** 16 assertions (`supabase/tests/paid-protection.test.sql`) — cascade regression, paid disqualify/replace refused with the paid row untouched, override logging the paid proof, the removed student never returning.
- **Admins can publish lessons from the builder (migration 0024).** Found live: the Teach builder promised admins "published straight away", but the lessons table only had admin update/delete policies, never INSERT — Publish died with a row-level-security error. One policy (`admin insert any lesson`) fixes it; it matches the existing admin update/delete rules.
- **Better signup / sign-in.** Signup now opens with three account-type cards — **Student** (keeps the School/Skills choice and grade picker), **Parent** (lands on tutor requests), **Tutor** (lands on the tutor application) — and the choice is honoured for Google signup and email-confirmation flows too. Login gained a **Forgot password?** link and a full reset flow (`/forgot-password` → email link → `/auth/reset`), which simply did not exist before. Password fields have show/hide eyes, signup shows a strength meter, and auth errors are plain-language ("Wrong email or password") instead of raw system text. All of it in Amharic as well — the forms' hard-coded English strings joined the dictionary.
- Database: run `supabase/RUN_FOR_V13_4.sql` (migrations 0024 + 0025) after the v13.3 step, then deploy the code. `check-setup.sql` gained 0024/0025 rows, and its 0023 probe no longer depends on the rebuild function's signature.

## v13.3 — prize rebuild + design polish (Oct 2026)
- **Prizes now follow the ranking (migration 0023).** The external re-review found the last real defect: "Replace winner" re-picked the same student (it excluded only current winners, so the person just removed qualified again), disqualify left a hole, and refilling a hole let 4th place jump over 3rd. Now the winners list is rebuilt from the ranking after **any** removal (`private.competition_rebuild_winners`): everyone below moves up one place, the next eligible student enters at the bottom, and each student's phone / verified / paid / payment-reference record travels with them. A replaced (not disqualified) student is recorded in `competition_removed_winners` so a later rebuild cannot quietly bring them back. Only a genuinely new winner gets the "you won" notification — rank moves do not re-notify. **Verified with a local PostgreSQL 16 run:** all three reported bugs were reproduced against the old functions first, then 10 scenario assertions passed against 0023 (replace shift, disqualify shift, paid/verified preservation, no resurrection, legacy-hole repair, prize labels follow ranks). The test script is kept at `supabase/tests/prize-rebuild.test.sql` (run with psql on a scratch database).
- **Design pass ("make it beautiful"):** forms everywhere share one softer look — rounded-xl inputs with a light fill that turns white on focus and a clear focus ring (both shared field styles updated together). Quiz questions are proper cards with a numbered badge and a live progress bar; answer options are big tappable rows with A/B/C/D letter badges that fill in when chosen, and results show check/cross badges with "Correct" / "Your answer" pills. Profiles: the student profile header is now a navy gradient band with an initial avatar and a grade chip; tutor cards and tutor pages get gradient initial avatars (and dark-mode-safe Verified/Recommended badges). Bottom-nav labels are back to 11px for readability on cheap phones (reviewer note).
- Database: run `supabase/RUN_FOR_V13_3.sql` (migration 0023). It is safe before or after the code deploy — function signatures are unchanged. `check-setup.sql` gained two 0023 rows.

## v11 — changes from Daniel's notebook notes (Oct 2026)
- **Jobs can be deleted** (poster/admin button on the job page), closed *and reopened*; open/filled/closed is shown as a clear coloured badge so tutors know a job's state before opening it.
- **Parents give a phone number** when they send a request (and on admin-posted jobs), and jobs carry a **male/female/any tutor preference** taken from the parent's request. Tutors set their gender on their tutor profile; the preference is enforced when applying.
- **Connect step:** once a tutor is accepted, the job page shows the admin a "Connect them" box with the parent's and the tutor's phone numbers (tap to call).
- **Questions are no longer multiple-choice only:** the lesson quiz builder now offers multiple choice, true/false, and short answer (typed; graded trimmed + case-insensitive, `|` separates accepted alternatives). Existing quizzes keep working.
- **Competitions:** ranking improved (0017): score first, then **seconds per question** (fair when totals differ), then earliest submission; disqualified players excluded; attempts averaging under 4 seconds per question are flagged "check before paying" on the manage page. The question entry now has a proper **one-by-one builder form** (question + answers + pick the correct circle) next to the paste-many box. Winners get a **verify** step (confirm a real student before paying), **prize payment with a reference** recorded on the winner row, and a **replace winner** button that moves the prize to the next student in the ranking. Creators/admins can delete a competition at any stage.
- **Design/language:** page headers, the home hero and the formal/interest landing banners are smaller, grade tiles are smaller; jobs, competitions, tutors, requests, community and search chrome now render in Amharic when the reader picks Amharic (locale cookie shared with server pages); job cards redesigned (subject as the title, budget/sessions line clearer).
- Database: run `supabase/UPGRADE_FROM_V10.sql` once in the SQL editor (applies 0015 if missing, then 0016). New installs run every migration in order, including `0014` and `0016`.

Bilingual (Amharic/English) learning platform for Ethiopia — built per the
Simplexer SRS: Next.js (App Router) + Tailwind CSS + Supabase (Postgres,
Auth, Storage) + KaTeX, deployable to Vercel.

This repo is the Phase 1 MVP: the full Formal Track / Interest Track
navigation and page set, real auth, real DB-backed progress and quizzes, and
one fully-populated vertical slice (Grade 11 Physics → Kinematics, and the
Intro to Python interest course) so the site is usable out of the box.

## 1. Supabase project setup

1. Create a new project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run **every** migration file **in order** from
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
   - `0007_tutor_jobs.sql` — tutor job board: jobs, teacher applications, and access rules
   - `0008_competitions.sql` — competitions: a quiz, a time window, a prize, and a leaderboard
   - `0009_admin_only_jobs.sql` — only admins can post tutor jobs
   - `0010_jobs_location_competition_rank.sql` — job location, schedule and language; competition ranks
   - `0011_competition_engine.sql` — competitions v2: private questions, timed single attempts, entry control, winners and payouts
   - `0012_security_and_resilience.sql` — locks roles and review status, hardens competitions, autosaves answers, adds reports
   - `0013_tutors_requests_visibility.sql` — tutor profiles with private document uploads, admin verification, family requests, profile visibility
   - `0014_tutor_directory_switch.sql` — admin switch for whether the tutor directory is public
   - `0016_notes_fixes.sql` — job contact phone + tutor gender preference, question types (true/false, short answer), winner payment reference + verification, promote-next-winner
   - `0017_better_ranking.sql` — competition ranking tie-break by seconds-per-question in leaderboard, finalize and replace-winner
   - `0018a_answer_key_setup.sql` — locked question_answers table + grade_quiz()/quiz_review() (run BEFORE deploying v12)
   - `0018b_answer_key_lock.sql` — drops the public is_correct / correct_text columns (run AFTER deploying v12)
   - `0019_notifications.sql` — in-app notifications table + event triggers
   - `0020_competition_delete_and_cleanup.sql` — managers may delete competitions at any stage; legacy prize/quiz_id columns removed
   - Shortcuts for existing installs: `RUN_BEFORE_V12.sql` (0018a+0019+0020), then deploy, then `RUN_AFTER_V12.sql` (0018b)
   - `0021_notes_round2.sql` — course competitions (>50% rule), admin request/review notifications, profile extras (shortcut: `RUN_FOR_V13.sql`)
   - `0015_content_tools.sql` — course drafts, lesson fonts, admin-managed structure, teacher quizzes, course media bucket
   (If you have the Supabase CLI linked to the project instead, `supabase db push` runs them all automatically.)
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
# create a file named .env.local in this folder with:
#   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co   (no /rest/v1 on the end)
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=your anon or publishable key
#   NEXT_PUBLIC_SITE_URL=http://localhost:3000
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

## v12 — security, notifications, design pass

- **Answer key locked.** Lesson-quiz answers moved to `question_answers` (teacher/admin only). Students submit to `grade_quiz()`; reviews come from `quiz_review()` for the attempt's owner only. The public `is_correct`/`correct_text` columns are dropped by 0018B after deployment.
- **Competition delete fixed.** The old policy blocked deleting finalized competitions while the button pretended otherwise, and the action hid the failure. Policy (0020), action (verifies a row was deleted, shows real errors) and UI (danger zone + confirmation) now agree.
- **Notifications.** New /notifications page + navbar bell. Database triggers announce request updates, new job applications, tutor matches, tutor verification, entry decisions, and winner announced/verified/paid.
- **Matching/search/language.** Submitting a tutor profile now requires gender (families ask for male/female tutors; drafts may skip it), and applying to a gendered job without it sends the tutor to their profile with an explanation. Search merges english + simple full-text configs so Amharic matches exactly-written words. Nav, admin tabs and teach chrome translate with the language toggle.
- **Forms & scale.** One shared form system (44px controls, one radius/focus style) across jobs, requests, tutor, teach, admin and competitions; local one-off styles removed. Home hero, navbar, footer, stats and banners reduced.
- **Tests.** `npm test` (Vitest): short-answer grading rules, the ranking comparator, and EN/AM dictionary parity. `npm run typecheck` for types.
- **Code health.** The 830-line `lib/actions.ts` is split into `lib/actions/` by domain (learning, courses, jobs, competitions, people, reports, shared).

## v13 — Daniel's notebook, round 2

- **Course competitions.** A competition can belong to one course. It appears in the list only for students who finished **more than 50%** of that course (managers always see it); the detail page shows the student's own percentage and a progress bar; join/start are enforced server-side by `competition_course_eligible()`. General competitions are unchanged.
- **Grades KG → adult** everywhere a level is chosen: one shared list (`lib/grade-levels.ts`) drives the parent request form and the admin job poster.
- **Notifications behave.** Opening a notification marks it read; the navbar bell re-counts on every navigation; notifications can be removed one by one or cleared once read. Admins are notified about new parent requests and about courses/lessons entering the review queues, and viewing those queues clears the matching notifications.
- **Search on growing lists:** admin tutors, admin requests, admin users, competitions.
- **Dark mode** toggle moved from the footer into the navbar.
- **Jobs redesigned again:** status stripe, budget block, chips, hover lift; job detail gained a proper hero header. Admin tutor cards gained avatar initials, subject chips, document pills and a separated review band.
- **Profile is manageable now:** display name, phone, Telegram username (ready for Telegram delivery), and notification preferences for jobs and competitions — the winner/match triggers respect them.

## v13.1 — Responsive pass (phone & tablet)

- **Top bar rebuilt for tablets.** The full link row now appears only at desktop
  width (lg, 1024px+). Phones and tablets get a compact menu button that opens
  a panel with every section plus the language switch — before, the full row
  switched on at 640px and crowded/wrapped the bar on every tablet. The Teach
  pill and language toggle follow the same rule; logo and spacing shrink a
  step on small screens; the Log in button can no longer wrap onto two lines.
- **Grids get a real tablet tier.** Forms and card grids that jumped straight
  to 4-across at 640px (admin tutors, admin requests, job/tutor filters, home
  stats) now go 2-across on tablets and 4-across only on desktop. Home course
  cards: 2 on tablet, 3 on desktop.
- **Phone polish.** Profile stat tiles and the Settings theme picker use
  smaller padding/type on phones so nothing is squeezed.
- Verified by rendering at 390px (phone), 768px (tablet portrait) and 1024px
  (tablet landscape): no horizontal overflow at any size, one-row header at
  every size. No database changes in this release — deploy the code only.

## v13.2 — Security review fixes + Amharic everywhere

- **Parent phone numbers are no longer public (CRITICAL).** `jobs.contact_phone`
  sat on a table anyone could read — a stranger could pull a family's name
  and number with the public key. Migration 0022 moves the number into a
  locked `job_contacts` table (poster/admin/matched tutor only) and drops
  the column. Contacts are exchanged through a `job_connect_card` RPC that
  answers only people connected to the job.
- **Notification phishing closed (CRITICAL).** The `sx_notify` helper moved
  from the public schema to a `private` schema the API cannot reach, every
  trigger was repointed, and the notifications table itself now refuses
  off-site links. The notification "Open" action also rejects
  protocol-relative links (`//evil.example`) — it used to accept anything
  starting with `/`.
- **Disqualify works after finalizing.** The old database function refused
  with "finalized", so Replace winner kept re-picking the same person.
  Disqualify now works at any stage and frees the prize place.
- **Gender preference enforced by the database.** The job_applications
  insert policy now checks the job's preference against the tutor's profile
  — not just the web page.
- **Contacts actually reach people.** After a match, the tutor sees the
  family's number on the job page, and the family sees the tutor's number
  on their requests page.
- **Amharic, including the forms.** Competitions (list, detail, manage),
  jobs (list, detail, post form), requests (page + form, KG→adult labels),
  the 5-step tutor form (labels, hints, checklist, upload errors), and the
  admin screens (requests, tutor review, queues) now render in Amharic when
  Amharic is selected. Dictionary: 361 keys per language, parity tested.
- **One setup path.** `supabase/SETUP.md` is the only ladder; the old
  one-time bundles moved to `supabase/legacy/`. `.env.local.example` added.
  ESLint is set up (`npm run lint`, 0 errors). Dependencies updated within
  their current major versions. **Not in this release:** the Next.js 16
  upgrade (the audit's critical fix) — it changes async cookies/params
  across the whole app and ships as its own release, planned next.
