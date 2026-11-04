-- Lesson safety: when a voice lesson leaves its topic.
--
-- The tutor recognises three situations and reports them through a Vapi tool
-- call to /api/vapi/lesson-event (checked with a secret), then ends the call:
--   drift      the student keeps talking about something else (not a rule
--              break; a learning difficulty can look like this)
--   violation  an attempt to override the tutor's rules, or inappropriate or
--              hurtful content
--   help       the student says something suggesting they are in danger.
--              Never treated as a rule break: it goes to their teacher.
--
-- What is stored: which call, which kind and category, when, and whether a
-- teacher has seen it. Never a recording, a transcript or a quote. Events
-- and call links are deleted after 30 days; monthly counts stay.
--
-- Who sees what:
--   * the student's teachers (classes the student is in): drift, violation
--     and help, with the short name the class already uses;
--   * platform admins: violations with the student's id, drift and help
--     only as numbers (help is the school's business, not ours);
--   * the student: only whether their own lesson ended for such a reason.
--
-- Safe to run more than once.

-- ─── Calls: which voice call belongs to which student ───────────────────────

create table if not exists public.lesson_calls (
  call_id text primary key check (char_length(call_id) between 8 and 100 and call_id ~ '^[A-Za-z0-9-]+$'),
  student_id text not null default public.requesting_user_id(),
  course_id uuid references public.courses (id) on delete set null,
  attempt_id uuid references public.lesson_attempts (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists lesson_calls_student_idx on public.lesson_calls (student_id, created_at desc);
create index if not exists lesson_calls_course_idx on public.lesson_calls (course_id);
create index if not exists lesson_calls_attempt_idx on public.lesson_calls (attempt_id);

alter table public.lesson_calls enable row level security;
revoke all on public.lesson_calls from anon, authenticated;
-- The app registers a call right after it starts; nobody reads the table
-- directly (the functions below do, with care)
grant insert (call_id, course_id, attempt_id) on public.lesson_calls to authenticated;

-- How many calls this student registered in the last hour (owner rights, so
-- the policy below can count without reading permission)
create or replace function private.recent_lesson_calls()
returns integer language sql stable security definer set search_path = ''
as $$
  select count(*)::int from public.lesson_calls
  where student_id = public.requesting_user_id() and created_at > now() - interval '1 hour'
$$;

drop policy if exists "calls: students register their own" on public.lesson_calls;
create policy "calls: students register their own"
  on public.lesson_calls for insert to authenticated
  with check (
    student_id = (select public.requesting_user_id())
    and (
      attempt_id is null
      or exists (
        select 1 from public.lesson_attempts a
        where a.id = attempt_id and a.student_id = (select public.requesting_user_id())
      )
    )
    and private.recent_lesson_calls() < 60
  );

-- ─── Events ─────────────────────────────────────────────────────────────────

create table if not exists public.lesson_events (
  id uuid primary key default gen_random_uuid(),
  call_id text not null check (char_length(call_id) between 8 and 100),
  kind text not null check (kind in ('drift', 'violation', 'help')),
  category text not null check (category in (
    'off_topic', 'override', 'inappropriate', 'hurtful', 'home', 'self', 'bullying', 'danger'
  )),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by text,
  false_alarm boolean not null default false,
  -- the tutor may call the tool twice in one lesson; one event per kind
  unique (call_id, kind),
  constraint lesson_events_kind_category check (
    (kind = 'drift' and category = 'off_topic')
    or (kind = 'violation' and category in ('override', 'inappropriate', 'hurtful'))
    or (kind = 'help' and category in ('home', 'self', 'bullying', 'danger'))
  )
);
create index if not exists lesson_events_created_idx on public.lesson_events (created_at desc);

alter table public.lesson_events enable row level security;
-- No direct access at all: teachers, admins and students go through the
-- functions below, which decide what each of them may see
revoke all on public.lesson_events from anon, authenticated;
drop policy if exists "events: no direct access" on public.lesson_events;
create policy "events: no direct access"
  on public.lesson_events for all to authenticated
  using (false) with check (false);

-- Monthly numbers, kept after the events themselves are deleted
create table if not exists public.lesson_event_counts (
  month date not null,
  kind text not null check (kind in ('drift', 'violation', 'help')),
  total integer not null default 0,
  primary key (month, kind)
);
alter table public.lesson_event_counts enable row level security;
revoke all on public.lesson_event_counts from anon, authenticated;
drop policy if exists "event counts: no direct access" on public.lesson_event_counts;
create policy "event counts: no direct access"
  on public.lesson_event_counts for all to authenticated
  using (false) with check (false);

-- ─── Lesson attempts: two new ways a lesson can end ─────────────────────────

alter table public.lesson_attempts drop constraint if exists lesson_attempts_end_reason_check;
alter table public.lesson_attempts add constraint lesson_attempts_end_reason_check
  check (end_reason in ('finished', 'left', 'mic_denied', 'error', 'off_topic', 'stopped'));

-- ─── Recording an event (only the server, with the service role key) ───────

-- Called by /api/vapi/lesson-event after it has checked the Vapi secret.
-- Runs with the caller's rights; only service_role may call it, and that
-- role is not subject to row level security.
create or replace function public.record_lesson_event(p_call_id text, p_kind text, p_category text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  inserted uuid;
  attempt uuid;
begin
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

  insert into public.lesson_events (call_id, kind, category)
  values (p_call_id, p_kind, p_category)
  on conflict (call_id, kind) do nothing
  returning id into inserted;
  if inserted is null then
    return 'already';
  end if;

  insert into public.lesson_event_counts (month, kind, total)
  values (date_trunc('month', now())::date, p_kind, 1)
  on conflict (month, kind) do update set total = public.lesson_event_counts.total + 1;

  -- An assignment lesson that ended this way is not "done", whatever the
  -- browser reports: drift reads as "left the topic", the others as stopped
  select lc.attempt_id into attempt from public.lesson_calls lc where lc.call_id = p_call_id;
  if attempt is not null then
    update public.lesson_attempts
    set end_reason = case when p_kind = 'drift' then 'off_topic' else 'stopped' end,
        ended_at = coalesce(ended_at, now())
    where id = attempt;
  end if;

  -- Keep only 30 days of details
  delete from public.lesson_events where created_at < now() - interval '30 days';
  delete from public.lesson_calls where created_at < now() - interval '30 days';

  return 'ok';
end;
$$;

revoke all on function public.record_lesson_event(text, text, text) from public, anon, authenticated;
grant execute on function public.record_lesson_event(text, text, text) to service_role;

-- If the event arrived before the app linked the call to its lesson (the
-- tutor reacted within the first second), apply it when the link arrives
create or replace function private.apply_early_lesson_events()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  first_kind text;
begin
  if new.attempt_id is null then
    return new;
  end if;
  select e.kind into first_kind from public.lesson_events e
  where e.call_id = new.call_id
  order by case e.kind when 'help' then 0 when 'violation' then 1 else 2 end
  limit 1;
  if first_kind is not null then
    update public.lesson_attempts
    set end_reason = case when first_kind = 'drift' then 'off_topic' else 'stopped' end,
        ended_at = coalesce(ended_at, now())
    where id = new.attempt_id;
  end if;
  return new;
end;
$$;

drop trigger if exists lesson_calls_apply_early_events on public.lesson_calls;
create trigger lesson_calls_apply_early_events
  after insert on public.lesson_calls
  for each row execute function private.apply_early_lesson_events();

-- ─── What a teacher sees ────────────────────────────────────────────────────

-- Events of students in the teacher's own classes, last 30 days, with the
-- short name and class the teacher already knows. Admin role alone gives
-- no access here (admins have their own view).
create or replace function private.teacher_lesson_events()
returns table (
  id uuid,
  kind text,
  category text,
  created_at timestamptz,
  acknowledged_at timestamptz,
  false_alarm boolean,
  student_name text,
  class_name text,
  course_name text
)
language sql stable security definer set search_path = ''
as $$
  select distinct on (e.id)
    e.id, e.kind, e.category, e.created_at, e.acknowledged_at, e.false_alarm,
    m.display_name, c.name, co.name
  from public.lesson_events e
  join public.lesson_calls lc on lc.call_id = e.call_id
  join public.class_members m on m.student_id = lc.student_id
  join public.classes c on c.id = m.class_id and c.teacher_id = public.requesting_user_id()
  left join public.courses co on co.id = lc.course_id
  where e.created_at > now() - interval '30 days'
  order by e.id, c.name
$$;

create or replace function public.teacher_lesson_events()
returns table (
  id uuid,
  kind text,
  category text,
  created_at timestamptz,
  acknowledged_at timestamptz,
  false_alarm boolean,
  student_name text,
  class_name text,
  course_name text
)
language sql stable security invoker set search_path = ''
as $$
  select * from private.teacher_lesson_events()
$$;

-- A teacher marks an event as seen (or as a false alarm). Only for events of
-- their own students. status: ok | not_found
create or replace function private.acknowledge_lesson_event(p_event uuid, p_false_alarm boolean)
returns text language plpgsql volatile security definer set search_path = ''
as $$
declare
  me text := public.requesting_user_id();
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  update public.lesson_events e
  set acknowledged_at = coalesce(e.acknowledged_at, now()),
      acknowledged_by = coalesce(e.acknowledged_by, me),
      false_alarm = coalesce(p_false_alarm, false)
  where e.id = p_event
    and exists (
      select 1 from public.lesson_calls lc
      join public.class_members m on m.student_id = lc.student_id
      join public.classes c on c.id = m.class_id and c.teacher_id = me
      where lc.call_id = e.call_id
    );
  return case when found then 'ok' else 'not_found' end;
end;
$$;

create or replace function public.acknowledge_lesson_event(p_event uuid, p_false_alarm boolean default false)
returns text language sql volatile security invoker set search_path = ''
as $$
  select private.acknowledge_lesson_event(p_event, p_false_alarm)
$$;

-- ─── What an admin sees ─────────────────────────────────────────────────────

-- Rule breaks, with the student's id (the app looks up the name in Clerk)
create or replace function private.admin_lesson_violations()
returns table (
  id uuid,
  category text,
  created_at timestamptz,
  acknowledged_at timestamptz,
  false_alarm boolean,
  student_id text,
  course_name text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return query
  select e.id, e.category, e.created_at, e.acknowledged_at, e.false_alarm, lc.student_id, co.name
  from public.lesson_events e
  left join public.lesson_calls lc on lc.call_id = e.call_id
  left join public.courses co on co.id = lc.course_id
  where e.kind = 'violation' and e.created_at > now() - interval '30 days'
  order by e.created_at desc
  limit 200;
end;
$$;

create or replace function public.admin_lesson_violations()
returns table (
  id uuid,
  category text,
  created_at timestamptz,
  acknowledged_at timestamptz,
  false_alarm boolean,
  student_id text,
  course_name text
)
language sql stable security invoker set search_path = ''
as $$
  select * from private.admin_lesson_violations()
$$;

-- Numbers only: drift and help without names or content
create or replace function private.admin_safety_stats()
returns table (
  drift_30d int,
  violation_30d int,
  help_30d int,
  help_seen_30d int,
  unassigned_30d int,
  violation_month int,
  help_month int
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return query
  select
    (select count(*)::int from public.lesson_events where kind = 'drift' and created_at > now() - interval '30 days'),
    (select count(*)::int from public.lesson_events where kind = 'violation' and created_at > now() - interval '30 days'),
    (select count(*)::int from public.lesson_events where kind = 'help' and created_at > now() - interval '30 days'),
    (select count(*)::int from public.lesson_events where kind = 'help' and acknowledged_at is not null and created_at > now() - interval '30 days'),
    -- events whose call was never linked to a student (no teacher could see them)
    (select count(*)::int from public.lesson_events e
       where e.created_at > now() - interval '30 days'
         and not exists (select 1 from public.lesson_calls lc where lc.call_id = e.call_id)),
    (select coalesce(sum(total), 0)::int from public.lesson_event_counts where kind = 'violation' and month = date_trunc('month', now())::date),
    (select coalesce(sum(total), 0)::int from public.lesson_event_counts where kind = 'help' and month = date_trunc('month', now())::date);
end;
$$;

create or replace function public.admin_safety_stats()
returns table (
  drift_30d int,
  violation_30d int,
  help_30d int,
  help_seen_30d int,
  unassigned_30d int,
  violation_month int,
  help_month int
)
language sql stable security invoker set search_path = ''
as $$
  select * from private.admin_safety_stats()
$$;

-- ─── What the student sees ──────────────────────────────────────────────────

-- How the student's own lesson ended, for the right closing screen.
-- Returns drift | violation | help, or null.
create or replace function private.my_lesson_outcome(p_call_id text)
returns text language sql stable security definer set search_path = ''
as $$
  select e.kind from public.lesson_events e
  join public.lesson_calls lc on lc.call_id = e.call_id
  where e.call_id = p_call_id and lc.student_id = public.requesting_user_id()
  order by case e.kind when 'help' then 0 when 'violation' then 1 else 2 end
  limit 1
$$;

create or replace function public.my_lesson_outcome(p_call_id text)
returns text language sql stable security invoker set search_path = ''
as $$
  select private.my_lesson_outcome(p_call_id)
$$;

-- ─── Grants ─────────────────────────────────────────────────────────────────

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

revoke all on function public.teacher_lesson_events() from public, anon;
grant execute on function public.teacher_lesson_events() to authenticated;
revoke all on function public.acknowledge_lesson_event(uuid, boolean) from public, anon;
grant execute on function public.acknowledge_lesson_event(uuid, boolean) to authenticated;
revoke all on function public.admin_lesson_violations() from public, anon;
grant execute on function public.admin_lesson_violations() to authenticated;
revoke all on function public.admin_safety_stats() from public, anon;
grant execute on function public.admin_safety_stats() to authenticated;
revoke all on function public.my_lesson_outcome(text) from public, anon;
grant execute on function public.my_lesson_outcome(text) to authenticated;

-- ─── Tips analytics: the admin's lesson safety page ─────────────────────────

alter table public.onboarding_events
  drop constraint if exists onboarding_events_flow_check;
alter table public.onboarding_events
  add constraint onboarding_events_flow_check check (
    flow in ('welcome', 'home', 'courses', 'newCourse', 'lesson', 'profile', 'subscription',
             'signIn', 'notFound', 'legal', 'classes', 'classDetail', 'assign', 'join',
             'teacherWelcome', 'teacherHome', 'library', 'lessonPreview', 'teacherProfile', 'newCourseTeacher',
             'adminHome', 'adminUsers', 'adminCourses', 'adminLog', 'adminProfile', 'adminPreview',
             'helpIntro', 'helpIntroAdult', 'adminSafety')
  );
