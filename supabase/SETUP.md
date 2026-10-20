# Simplexer database setup — the one path

There is exactly one ladder. Find where your database is, then follow the
steps below it **in order**. Run each file once, in Supabase → SQL Editor.
If a step errors with "already exists", that step was already applied —
skip it and continue.

First, run `check-setup.sql`. It prints one row per feature with
true/false. The false rows tell you where you are on the ladder.

## The ladder

| Step | File | You need it if check-setup says |
| --- | --- | --- |
| 1 | `RUN_BEFORE_V12.sql` | 0018 answer key / 0019 notifications = false |
| 2 | Deploy the v12 (or newer) code | after step 1 |
| 3 | `RUN_AFTER_V12.sql` | 0018 locked = false. **Only after the new code is live** — it deletes the old answer columns |
| 4 | `RUN_FOR_V13.sql` | any 0021 row = false |
| 5 | `RUN_FOR_V13_2.sql` | any 0022 row = false |
| 6 | Deploy the v13.2 code | after step 5 — run the SQL and deploy together; job posting touches the moved phone column |
| 7 | `RUN_FOR_V13_3.sql` | any 0023 row = false (prize rebuild — safe to run any time; it only replaces two competition functions and adds one locked table) |
| 8 | Deploy the v13.3 code | after step 7 |
| 9 | `RUN_FOR_V13_4.sql` | any 0024/0025 row = false (0024: admins can insert lessons — the live Publish fix. 0025: paid winners can't vanish — removal log, paid guard, winner messages. Both safe to run any time after step 7) |
| 10 | Deploy the v13.4 code | after step 9 |
| 11 | `RUN_FOR_V13_5.sql` | any 0026 row = false (lesson visibility: teachers pick public / enrolled-only / private per lesson; quiz reads follow the lesson. Safe to re-run) |
| 12 | Deploy the v13.5 code | after step 11 |
| 13 | Run `check-setup.sql` again | every row should say **true** — the last 0026 row is a behaviour probe: it proves a private lesson is not readable by a logged-out visitor |

**Never go backwards:** the RUN files redefine shared functions and
policies. Always finish on the newest file you ran. Re-running an older
RUN file after a newer one silently switches newer behaviour off, with
no error. If a file errors, fix and re-run that same file only.

## Brand-new database

Run every file in `migrations/` in number order (0001 → 0026), or run the
ladder bundles in the same order as the table above. The bundles are just
the migrations grouped; never run both a bundle and its migration.

## Files in `legacy/` — do not run

`RUN_ME_ONCE.sql` and `UPGRADE_FROM_V10.sql` were one-time bundles for
older databases. They are kept only as history. Running them on a current
database will error or duplicate work. The ladder above replaces them.

## Environment variables

Copy `.env.local.example` (project root) to `.env.local` and fill in your
own Supabase project URL and anon key. Never commit `.env.local`.
