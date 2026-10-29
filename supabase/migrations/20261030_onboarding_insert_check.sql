-- Replaces the "with check (true)" insert policy on onboarding_events that the
-- Supabase Security Advisor flags ("RLS Policy Always True").
--
-- Students still add events without signing in (the sign-in and legal pages
-- have tips too), but now:
--   * only the four data columns can be written; id and created_at always
--     come from the database, so nobody can backdate or overwrite rows;
--   * the policy itself checks the values, so a row only goes in when it
--     looks like a real event from the app.
-- Reading stays impossible through the API (see 20261030_hide_schema.sql).
--
-- Safe to run more than once.

revoke insert on public.onboarding_events from anon, authenticated;
grant insert (flow, event, step, locale) on public.onboarding_events to anon, authenticated;

drop policy if exists "Anyone can add onboarding events" on public.onboarding_events;
drop policy if exists "Anyone can add valid onboarding events" on public.onboarding_events;
create policy "Anyone can add valid onboarding events"
  on public.onboarding_events
  for insert
  to anon, authenticated
  with check (
    char_length(flow) between 1 and 20
    and event in ('start', 'complete', 'skip', 'mic_granted', 'mic_denied', 'mic_unavailable')
    and locale in ('hu', 'en')
    and (step is null or step between 0 and 20)
    and created_at > now() - interval '1 minute'
  );
