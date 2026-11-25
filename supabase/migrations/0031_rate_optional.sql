-- 0031_rate_optional.sql
-- The tutor rate is optional. An applicant may leave it empty, and empty
-- means "not set" (null) instead of a fake 0 ETB showing on their card.
-- Existing rows with rate = 0 are displayed as "not set" by the app.

alter table public.tutor_profiles alter column rate drop not null;
