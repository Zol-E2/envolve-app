-- Follow-up to 20261101_teacher_classes.sql, after the Supabase Security
-- Advisor's review:
--
-- 1. The membership checks used by the policies run with owner rights
--    (security definer). In the public schema the REST API also lets anyone
--    call them directly, so they move to a "private" schema the API does not
--    expose. Only signed-in users may run them, and only through policies.
-- 2. Tables with two permissive SELECT policies (teacher + student) get one
--    combined SELECT policy each, which is also faster.
--
-- join_class() stays in public on purpose: students call it to join with a
-- code. It only accepts a code, is rate limited and returns a status.
--
-- Safe to run more than once.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_class_teacher(p_class uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.classes
    where id = p_class and teacher_id = public.requesting_user_id()
  )
$$;

create or replace function private.is_class_member(p_class uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.class_members
    where class_id = p_class and student_id = public.requesting_user_id()
  )
$$;

create or replace function private.is_assignment_teacher(p_assignment uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = p_assignment and c.teacher_id = public.requesting_user_id()
  )
$$;

create or replace function private.is_assigned_to_me(p_assignment uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    join public.class_members m
      on m.class_id = a.class_id and m.student_id = public.requesting_user_id()
    where a.id = p_assignment
      and (a.everyone or exists (
        select 1 from public.assignment_students s
        where s.assignment_id = a.id and s.student_id = m.student_id
      ))
  )
$$;

create or replace function private.is_member_of_assignment_class(p_assignment uuid, p_student text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    join public.class_members m on m.class_id = a.class_id
    where a.id = p_assignment and m.student_id = p_student
  )
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ─── Policies, now on the private helpers ─────────────────────────────────

-- Classes
drop policy if exists "classes: teacher and members read" on public.classes;
create policy "classes: teacher and members read"
  on public.classes for select to authenticated
  using (teacher_id = (select public.requesting_user_id()) or private.is_class_member(id));

-- Class members
drop policy if exists "members: self and teacher read" on public.class_members;
drop policy if exists "members: teacher sets support" on public.class_members;
drop policy if exists "members: leave or remove" on public.class_members;

create policy "members: self and teacher read"
  on public.class_members for select to authenticated
  using (student_id = (select public.requesting_user_id()) or private.is_class_teacher(class_id));

create policy "members: teacher sets support"
  on public.class_members for update to authenticated
  using (private.is_class_teacher(class_id))
  with check (private.is_class_teacher(class_id));

create policy "members: leave or remove"
  on public.class_members for delete to authenticated
  using (student_id = (select public.requesting_user_id()) or private.is_class_teacher(class_id));

-- Assignments: one read policy for teacher and student, writes for the teacher
drop policy if exists "assignments: teacher manages" on public.assignments;
drop policy if exists "assignments: students read their own" on public.assignments;
drop policy if exists "assignments: teacher and students read" on public.assignments;
drop policy if exists "assignments: teacher creates" on public.assignments;
drop policy if exists "assignments: teacher edits" on public.assignments;
drop policy if exists "assignments: teacher deletes" on public.assignments;

create policy "assignments: teacher and students read"
  on public.assignments for select to authenticated
  using (private.is_class_teacher(class_id) or private.is_assigned_to_me(id));

create policy "assignments: teacher creates"
  on public.assignments for insert to authenticated
  with check (private.is_class_teacher(class_id) and created_by = (select public.requesting_user_id()));

create policy "assignments: teacher edits"
  on public.assignments for update to authenticated
  using (private.is_class_teacher(class_id))
  with check (private.is_class_teacher(class_id));

create policy "assignments: teacher deletes"
  on public.assignments for delete to authenticated
  using (private.is_class_teacher(class_id));

-- Picked students
drop policy if exists "assignment students: teacher manages" on public.assignment_students;
drop policy if exists "assignment students: student reads own" on public.assignment_students;
drop policy if exists "assignment students: teacher and student read" on public.assignment_students;
drop policy if exists "assignment students: teacher picks" on public.assignment_students;
drop policy if exists "assignment students: teacher unpicks" on public.assignment_students;

create policy "assignment students: teacher and student read"
  on public.assignment_students for select to authenticated
  using (student_id = (select public.requesting_user_id()) or private.is_assignment_teacher(assignment_id));

create policy "assignment students: teacher picks"
  on public.assignment_students for insert to authenticated
  with check (
    private.is_assignment_teacher(assignment_id)
    and private.is_member_of_assignment_class(assignment_id, student_id)
  );

create policy "assignment students: teacher unpicks"
  on public.assignment_students for delete to authenticated
  using (private.is_assignment_teacher(assignment_id));

revoke update on public.assignment_students from authenticated;

-- Lesson attempts
drop policy if exists "attempts: student records own" on public.lesson_attempts;
drop policy if exists "attempts: student reads own" on public.lesson_attempts;
drop policy if exists "attempts: teacher reads assignment lessons" on public.lesson_attempts;
drop policy if exists "attempts: student and teacher read" on public.lesson_attempts;

create policy "attempts: student records own"
  on public.lesson_attempts for insert to authenticated
  with check (
    student_id = (select public.requesting_user_id())
    and private.is_assigned_to_me(assignment_id)
    and course_id = (select a.course_id from public.assignments a where a.id = assignment_id)
  );

create policy "attempts: student and teacher read"
  on public.lesson_attempts for select to authenticated
  using (student_id = (select public.requesting_user_id()) or private.is_assignment_teacher(assignment_id));

-- ─── The old public copies are no longer used ─────────────────────────────

drop function if exists public.is_class_teacher(uuid);
drop function if exists public.is_class_member(uuid);
drop function if exists public.is_assignment_teacher(uuid);
drop function if exists public.is_assigned_to_me(uuid);
drop function if exists public.is_member_of_assignment_class(uuid, text);

-- Helpers that stay public: nobody signed out needs them
revoke all on function public.new_join_code() from public, anon;
grant execute on function public.new_join_code() to authenticated;
revoke all on function public.requesting_app_role() from anon;
revoke all on function public.is_teacher() from anon;
