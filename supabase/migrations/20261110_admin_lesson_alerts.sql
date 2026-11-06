-- Lesson safety: admins also see calls for help by name (after 20261109).
--
-- Until now admins saw rule breaks with the student's name and calls for
-- help only as numbers. A call for help is the most serious of the three,
-- so it must not be possible for it to go unnoticed (a student without a
-- class, a teacher who never looks). Admins now see both kinds with the
-- student's id; the app looks the name up in Clerk. Drift stays a number.
-- Still never what was said: only the kind, the category and the time.
--
-- Safe to run more than once.

create or replace function private.admin_lesson_alerts()
returns table (
  id uuid,
  kind text,
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
  select e.id, e.kind::text, e.category::text, e.created_at, e.acknowledged_at, e.false_alarm,
         lc.student_id::text, co.name::text
  from public.lesson_events e
  left join public.lesson_calls lc on lc.call_id = e.call_id
  left join public.courses co on co.id = lc.course_id
  where e.kind in ('help', 'violation') and e.created_at > now() - interval '30 days'
  order by case e.kind when 'help' then 0 else 1 end, e.created_at desc
  limit 200;
end;
$$;

create or replace function public.admin_lesson_alerts()
returns table (
  id uuid,
  kind text,
  category text,
  created_at timestamptz,
  acknowledged_at timestamptz,
  false_alarm boolean,
  student_id text,
  course_name text
)
language sql stable security invoker set search_path = ''
as $$
  select * from private.admin_lesson_alerts()
$$;

revoke all on function private.admin_lesson_alerts() from public, anon;
grant execute on function private.admin_lesson_alerts() to authenticated;
revoke all on function public.admin_lesson_alerts() from public, anon;
grant execute on function public.admin_lesson_alerts() to authenticated;
