-- Anonymous onboarding events, used to measure where new students get stuck
-- (welcome screen, page tours, microphone test). No user id is stored on
-- purpose, so the data cannot be linked back to a student.

create table if not exists public.onboarding_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  flow text not null,
  event text not null check (
    event in ('start', 'complete', 'skip', 'mic_granted', 'mic_denied', 'mic_unavailable')
  ),
  step smallint check (step between 0 and 20),
  locale text not null check (locale in ('hu', 'en'))
);

-- Which screen the event came from. Kept as a named constraint so it can be
-- replaced when new pages get tips (re-running this file updates it).
alter table public.onboarding_events
  drop constraint if exists onboarding_events_flow_check;
alter table public.onboarding_events
  add constraint onboarding_events_flow_check check (
    flow in ('welcome', 'home', 'courses', 'newCourse', 'lesson', 'profile', 'subscription', 'signIn', 'notFound')
  );

alter table public.onboarding_events enable row level security;

-- Anyone using the app may add an event; nobody can read them through the
-- API. Read the results in the Supabase dashboard (SQL editor) instead.
drop policy if exists "Anyone can add onboarding events" on public.onboarding_events;
create policy "Anyone can add onboarding events"
  on public.onboarding_events
  for insert
  to anon, authenticated
  with check (true);
