-- A teacher can mark a stuck student as handled (after 20261110).
--
-- "Elakadt" (stuck) comes from the student's latest lesson attempt on an
-- assignment, so until now it stayed until the student tried again. Now the
-- teacher can say "I have dealt with it": the latest attempt gets
-- teacher_ack_at, and the overview, the class page and the class badge stop
-- counting it as stuck. A new attempt by the student is judged afresh.
--
-- Marking a stuck lesson as handled also marks its lesson alert (if the
-- tutor stopped it) as seen, and the other way round, so the teacher never
-- has to clear the same lesson twice.
--
-- Students can never set these columns: they may only update ended_at,
-- seconds and end_reason (20261101_teacher_classes.sql), and the insert
-- policy below requires them to be empty.
--
-- Safe to run more than once.

alter table public.lesson_attempts add column if not exists teacher_ack_at timestamptz;
alter table public.lesson_attempts add column if not exists teacher_ack_by text;

drop policy if exists "attempts: student records own" on public.lesson_attempts;
create policy "attempts: student records own"
  on public.lesson_attempts for insert to authenticated
  with check (
    student_id = (select public.requesting_user_id())
    and private.is_assigned_to_me(assignment_id)
    and course_id = (select a.course_id from public.assignments a where a.id = assignment_id)
    and teacher_ack_at is null
    and teacher_ack_by is null
  );

-- status: ok | not_found
create or replace function private.mark_attempt_handled(p_assignment uuid, p_student text)
returns text language plpgsql volatile security definer set search_path = ''
as $$
declare
  me text := public.requesting_user_id();
  latest uuid;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  if not private.is_assignment_teacher(p_assignment) then
    return 'not_found';
  end if;

  select a.id into latest
  from public.lesson_attempts a
  where a.assignment_id = p_assignment and a.student_id = p_student
  order by a.started_at desc
  limit 1;
  if latest is null then
    return 'not_found';
  end if;

  update public.lesson_attempts
  set teacher_ack_at = coalesce(teacher_ack_at, now()),
      teacher_ack_by = coalesce(teacher_ack_by, me)
  where id = latest;

  -- The lesson alert of the same lesson, if the tutor stopped it
  update public.lesson_events e
  set acknowledged_at = coalesce(e.acknowledged_at, now()),
      acknowledged_by = coalesce(e.acknowledged_by, me)
  where e.call_id in (select lc.call_id from public.lesson_calls lc where lc.attempt_id = latest);

  return 'ok';
end;
$$;

create or replace function public.mark_attempt_handled(p_assignment uuid, p_student text)
returns text language sql volatile security invoker set search_path = ''
as $$
  select private.mark_attempt_handled(p_assignment, p_student)
$$;

-- Seeing a lesson alert also clears the stuck mark of the same assignment
-- lesson, when it belongs to one of this teacher's assignments
create or replace function private.acknowledge_lesson_event(p_event uuid, p_false_alarm boolean)
returns text language plpgsql volatile security definer set search_path = ''
as $$
declare
  me text := public.requesting_user_id();
  v_call text;
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
    )
  returning e.call_id into v_call;
  if v_call is null then
    return 'not_found';
  end if;

  update public.lesson_attempts a
  set teacher_ack_at = coalesce(a.teacher_ack_at, now()),
      teacher_ack_by = coalesce(a.teacher_ack_by, me)
  where a.id in (select lc.attempt_id from public.lesson_calls lc where lc.call_id = v_call)
    and private.is_assignment_teacher(a.assignment_id);

  return 'ok';
end;
$$;

revoke all on function private.mark_attempt_handled(uuid, text) from public, anon;
grant execute on function private.mark_attempt_handled(uuid, text) to authenticated;
revoke all on function public.mark_attempt_handled(uuid, text) from public, anon;
grant execute on function public.mark_attempt_handled(uuid, text) to authenticated;
