-- Locks the database down so every student can only reach their own data.
--
-- Before this file:
--   * "All" (anon, SELECT, true): anyone holding the public anon key (it is in
--     every browser) could read all courses, all bookmarks and every student's
--     lesson history, with their user ids.
--   * "Clerk" (authenticated, ALL, jwt is not null): any signed-in user could
--     change or delete ANY course, bookmark or history row, because permissive
--     policies are OR-ed together and this one allowed everything.
--
-- After this file:
--   * Not signed in (anon): no access to courses, bookmarks or history.
--   * Signed in: may read the shared course library, and change only their own
--     courses, bookmarks and lesson history. The Clerk user id arrives in the
--     JWT "sub" claim (Supabase third-party auth with Clerk).
--
-- Safe to run more than once.

-- Helper: the signed-in Clerk user id, or null
create or replace function public.requesting_user_id()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'sub', '')
$$;

alter table public.courses enable row level security;
alter table public.bookmarks enable row level security;
alter table public.session_history enable row level security;
alter table public.onboarding_events enable row level security;

-- Remove the old, too-wide policies
drop policy if exists "All" on public.courses;
drop policy if exists "Clerk" on public.courses;
drop policy if exists "All" on public.bookmarks;
drop policy if exists "Clerk" on public.bookmarks;
drop policy if exists "delete own bookmarks" on public.bookmarks;
drop policy if exists "insert own bookmarks" on public.bookmarks;
drop policy if exists "select own bookmarks" on public.bookmarks;
drop policy if exists "All" on public.session_history;
drop policy if exists "Clerk" on public.session_history;
drop policy if exists "sh insert own" on public.session_history;

-- Policies created by this file (dropped first so re-running works)
drop policy if exists "courses: signed-in users read the library" on public.courses;
drop policy if exists "courses: create as yourself" on public.courses;
drop policy if exists "courses: authors edit their own" on public.courses;
drop policy if exists "courses: authors delete their own" on public.courses;
drop policy if exists "bookmarks: own only" on public.bookmarks;
drop policy if exists "history: own only" on public.session_history;

-- Courses: a shared library for signed-in students, edited only by the author
create policy "courses: signed-in users read the library"
  on public.courses for select to authenticated
  using ((select public.requesting_user_id()) is not null);

create policy "courses: create as yourself"
  on public.courses for insert to authenticated
  with check (author = (select public.requesting_user_id()));

create policy "courses: authors edit their own"
  on public.courses for update to authenticated
  using (author = (select public.requesting_user_id()))
  with check (author = (select public.requesting_user_id()));

create policy "courses: authors delete their own"
  on public.courses for delete to authenticated
  using (author = (select public.requesting_user_id()));

-- Bookmarks and lesson history: private to each student
create policy "bookmarks: own only"
  on public.bookmarks for all to authenticated
  using (user_id = (select public.requesting_user_id()))
  with check (user_id = (select public.requesting_user_id()));

create policy "history: own only"
  on public.session_history for all to authenticated
  using (user_id = (select public.requesting_user_id()))
  with check (user_id = (select public.requesting_user_id()));

-- The anon role needs nothing on these tables (onboarding_events keeps its
-- insert-only policy from 20261021_onboarding_events.sql)
revoke all on public.courses, public.bookmarks, public.session_history from anon;

-- Sanity limits for new rows, so a broken or hostile client cannot store
-- huge or unexpected values. "not valid" leaves existing rows untouched.
alter table public.courses drop constraint if exists courses_name_length;
alter table public.courses add constraint courses_name_length
  check (char_length(name) between 1 and 80) not valid;
alter table public.courses drop constraint if exists courses_topic_length;
alter table public.courses add constraint courses_topic_length
  check (char_length(topic) between 1 and 500) not valid;
alter table public.courses drop constraint if exists courses_duration_range;
alter table public.courses add constraint courses_duration_range
  check (duration between 1 and 60) not valid;
alter table public.courses drop constraint if exists courses_subject_known;
alter table public.courses add constraint courses_subject_known
  check (subject in ('maths', 'language', 'science', 'history', 'coding', 'economics')) not valid;
alter table public.courses drop constraint if exists courses_voice_known;
alter table public.courses add constraint courses_voice_known
  check (voice in ('male', 'female')) not valid;
