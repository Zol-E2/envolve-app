-- Lesson safety fixes (after 20261107_lesson_safety.sql).
--
-- 1. The admin's list of rule breaks failed with "Returned type character
--    varying does not match expected type text": in the live database some
--    name columns (courses.name) are varchar. Every text column the
--    functions return is now cast to text explicitly.
-- 2. A small function for the alert bar on every admin page: how many rule
--    breaks and calls for help no teacher has opened yet, how many reports
--    could not be linked to a student, and when the newest of these came
--    (so the bar can tell "new since you last looked"). Numbers only.
--
-- Safe to run more than once.

-- ─── 1. Teacher list, with explicit text casts ──────────────────────────────

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
    e.id, e.kind::text, e.category::text, e.created_at, e.acknowledged_at, e.false_alarm,
    m.display_name::text, c.name::text, co.name::text
  from public.lesson_events e
  join public.lesson_calls lc on lc.call_id = e.call_id
  join public.class_members m on m.student_id = lc.student_id
  join public.classes c on c.id = m.class_id and c.teacher_id = public.requesting_user_id()
  left join public.courses co on co.id = lc.course_id
  where e.created_at > now() - interval '30 days'
  order by e.id, c.name
$$;

-- ─── 1. Admin list of rule breaks, with explicit text casts ─────────────────

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
  select e.id, e.category::text, e.created_at, e.acknowledged_at, e.false_alarm,
         lc.student_id::text, co.name::text
  from public.lesson_events e
  left join public.lesson_calls lc on lc.call_id = e.call_id
  left join public.courses co on co.id = lc.course_id
  where e.kind = 'violation' and e.created_at > now() - interval '30 days'
  order by e.created_at desc
  limit 200;
end;
$$;

-- ─── 2. Open items for the admin alert bar ──────────────────────────────────

create or replace function private.admin_safety_open()
returns table (
  violation_open int,
  help_open int,
  unassigned_30d int,
  latest_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return query
  select
    (select count(*)::int from public.lesson_events e
       where e.kind = 'violation' and e.acknowledged_at is null
         and e.created_at > now() - interval '30 days'),
    (select count(*)::int from public.lesson_events e
       where e.kind = 'help' and e.acknowledged_at is null
         and e.created_at > now() - interval '30 days'),
    (select count(*)::int from public.lesson_events e
       where e.created_at > now() - interval '30 days'
         and not exists (select 1 from public.lesson_calls lc where lc.call_id = e.call_id)),
    (select max(e.created_at) from public.lesson_events e
       where e.created_at > now() - interval '30 days'
         and e.kind in ('violation', 'help')
         and (e.acknowledged_at is null
              or not exists (select 1 from public.lesson_calls lc where lc.call_id = e.call_id)));
end;
$$;

create or replace function public.admin_safety_open()
returns table (
  violation_open int,
  help_open int,
  unassigned_30d int,
  latest_at timestamptz
)
language sql stable security invoker set search_path = ''
as $$
  select * from private.admin_safety_open()
$$;

-- ─── Grants (only for the new functions) ────────────────────────────────────

revoke all on function private.admin_safety_open() from public, anon;
grant execute on function private.admin_safety_open() to authenticated;
revoke all on function public.admin_safety_open() from public, anon;
grant execute on function public.admin_safety_open() to authenticated;
