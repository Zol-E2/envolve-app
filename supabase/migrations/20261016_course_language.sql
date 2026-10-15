-- Lesson language per course. Replaces the formal/casual "style" setting.

alter table public.courses
  add column if not exists language text not null default 'en'
  check (language in ('hu', 'en'));

-- Existing courses were built for the English tutor, so they keep 'en'.
-- New courses always send their language explicitly; 'hu' is only a fallback.
alter table public.courses alter column language set default 'hu';

-- The app no longer sends "style".
alter table public.courses alter column style drop not null;
