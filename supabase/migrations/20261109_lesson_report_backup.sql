-- Lesson safety: a second way for a report to arrive (after 20261108).
--
-- The tutor's report normally comes from Vapi to /api/vapi/lesson-event.
-- The same tool call also reaches the student's browser, so the browser now
-- sends it too, through report_my_lesson_event(). Whichever arrives first
-- is stored; the other one changes nothing (one event per call and kind).
-- This way a teacher hears about a stopped lesson even if the Vapi request
-- fails (network, deploy, wrong secret).
--
-- What a browser can do with it: report one of the three kinds for a call
-- it registered itself in the last 3 hours, at most 20 times a day. It can
-- never report anyone else's call. A child could make up a report about
-- their own lesson; it goes to their own teacher, marked as coming from the
-- browser, which is acceptable for a safety alert.
--
-- Safe to run more than once.

alter table public.lesson_events
  add column if not exists source text not null default 'tutor';
alter table public.lesson_events drop constraint if exists lesson_events_source_check;
alter table public.lesson_events add constraint lesson_events_source_check
  check (source in ('tutor', 'browser'));

-- status: ok | already | invalid | unknown (no such call of mine yet) | limit
create or replace function private.report_my_lesson_event(p_call_id text, p_kind text, p_category text)
returns text language plpgsql volatile security definer set search_path = ''
as $$
declare
  me text := public.requesting_user_id();
  inserted uuid;
  attempt uuid;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  if p_call_id is null or char_length(p_call_id) not between 8 and 100 or p_call_id !~ '^[A-Za-z0-9-]+$' then
    return 'invalid';
  end if;
  if not (
    (p_kind = 'drift' and p_category = 'off_topic')
    or (p_kind = 'violation' and p_category in ('override', 'inappropriate', 'hurtful'))
    or (p_kind = 'help' and p_category in ('home', 'self', 'bullying', 'danger'))
  ) then
    return 'invalid';
  end if;

  -- Only a call this student linked to themselves, recently
  select lc.attempt_id into attempt
  from public.lesson_calls lc
  where lc.call_id = p_call_id and lc.student_id = me and lc.created_at > now() - interval '3 hours';
  if not found then
    return 'unknown';
  end if;

  if (
    select count(*) from public.lesson_events e
    join public.lesson_calls lc on lc.call_id = e.call_id
    where lc.student_id = me and e.source = 'browser' and e.created_at > now() - interval '1 day'
  ) >= 20 then
    return 'limit';
  end if;

  insert into public.lesson_events (call_id, kind, category, source)
  values (p_call_id, p_kind, p_category, 'browser')
  on conflict (call_id, kind) do nothing
  returning id into inserted;
  if inserted is null then
    return 'already';
  end if;

  insert into public.lesson_event_counts (month, kind, total)
  values (date_trunc('month', now())::date, p_kind, 1)
  on conflict (month, kind) do update set total = public.lesson_event_counts.total + 1;

  if attempt is not null then
    update public.lesson_attempts
    set end_reason = case when p_kind = 'drift' then 'off_topic' else 'stopped' end,
        ended_at = coalesce(ended_at, now())
    where id = attempt;
  end if;

  return 'ok';
end;
$$;

create or replace function public.report_my_lesson_event(p_call_id text, p_kind text, p_category text)
returns text language sql volatile security invoker set search_path = ''
as $$
  select private.report_my_lesson_event(p_call_id, p_kind, p_category)
$$;

revoke all on function private.report_my_lesson_event(text, text, text) from public, anon;
grant execute on function private.report_my_lesson_event(text, text, text) to authenticated;
revoke all on function public.report_my_lesson_event(text, text, text) from public, anon;
grant execute on function public.report_my_lesson_event(text, text, text) to authenticated;
