-- Follow-up to the Supabase Security Advisor after 20261030_lock_down_access.sql.
--
-- The app talks to the database only through the REST API (supabase-js),
-- never through GraphQL. Removing the GraphQL extension stops anyone from
-- listing the tables and columns through it. (Re-enable any time with:
-- create extension pg_graphql;)
drop extension if exists pg_graphql;

-- Onboarding events are write-only from the app: nobody needs to read them
-- through the API (look at them in the dashboard's SQL editor instead).
revoke select, update, delete on public.onboarding_events from anon, authenticated;
