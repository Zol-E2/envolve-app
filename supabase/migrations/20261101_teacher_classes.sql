-- Teacher view: classes, join codes, assignments and lesson attempts.
--
-- Who may do what (enforced here, whatever the app or a browser sends):
--   * Teacher = the Clerk session token carries app_role "teacher" or
--     "admin". Only the project owner can set it (scripts/set-role.mjs writes
--     Clerk publicMetadata, which browsers cannot change), and the Clerk
--     session token template copies it into the "app_role" claim.
--   * A teacher sees and manages only their own classes, the students in
--     them, their assignments, and the lessons started from those
--     assignments. Never a student's free-time lessons or conversations.
--   * A student sees the classes they joined and the assignments meant for
--     them, joins only with a valid code (join_class(), rate limited), and
--     may leave a class at any time.
--
-- Safe to run more than once.

-- ─── Helpers ────────────────────────────────────────────────────────────────

create or replace function public.requesting_app_role()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'app_role', '')
$$;

create or replace function public.is_teacher()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(public.requesting_app_role() in ('teacher', 'admin'), false)
$$;

-- Six characters from an alphabet without look-alikes (no 0/O, 1/I/L), from
-- the strong random source behind gen_random_uuid()
create or replace function public.new_join_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  code text := '';
begin
  for i in 0..5 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return code;
end;
$$;

-- ─── Tables ─────────────────────────────────────────────────────────────────

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  teacher_id text not null default public.requesting_user_id(),
  teacher_name text not null check (char_length(teacher_name) between 1 and 60),
  name text not null check (char_length(name) between 1 and 60),
  subject text check (subject in ('maths', 'language', 'science', 'history', 'coding', 'economics')),
  join_code text not null unique default public.new_join_code()
    check (join_code ~ '^[A-HJKMNP-Z2-9]{6}$')
);
create index if not exists classes_teacher_idx on public.classes (teacher_id);

create table if not exists public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id text not null,
  display_name text not null check (char_length(display_name) between 1 and 40),
  -- Per-student support set by the teacher: slowerSpeech, shorterMinutes, autoRead
  support jsonb not null default '{}'::jsonb check (
    jsonb_typeof(support) = 'object'
    and (support - array['slowerSpeech', 'shorterMinutes', 'autoRead']) = '{}'::jsonb
    and coalesce(jsonb_typeof(support -> 'slowerSpeech'), 'boolean') = 'boolean'
    and coalesce(jsonb_typeof(support -> 'autoRead'), 'boolean') = 'boolean'
    and (
      support -> 'shorterMinutes' is null
      or jsonb_typeof(support -> 'shorterMinutes') = 'null'
      or (jsonb_typeof(support -> 'shorterMinutes') = 'number'
          and (support ->> 'shorterMinutes')::numeric between 3 and 60)
    )
  ),
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);
create index if not exists class_members_student_idx on public.class_members (student_id);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  class_id uuid not null references public.classes (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_by text not null default public.requesting_user_id(),
  due_date date,
  message text check (char_length(message) <= 200),
  -- true: the whole class; false: only the students in assignment_students
  everyone boolean not null default true
);
create index if not exists assignments_class_idx on public.assignments (class_id);

create table if not exists public.assignment_students (
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id text not null,
  primary key (assignment_id, student_id)
);
create index if not exists assignment_students_student_idx on public.assignment_students (student_id);

-- One row per lesson started from an assignment. No transcript, no audio.
create table if not exists public.lesson_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id text not null default public.requesting_user_id(),
  course_id uuid not null references public.courses (id) on delete cascade,
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  seconds integer check (seconds between 0 and 7200),
  end_reason text check (end_reason in ('finished', 'left', 'mic_denied', 'error'))
);
create index if not exists lesson_attempts_assignment_idx on public.lesson_attempts (assignment_id);
create index if not exists lesson_attempts_student_idx on public.lesson_attempts (student_id);

-- Join attempts, for the rate limit in join_class(). No policies: only the
-- function below (running as the owner) reads and writes it.
create table if not exists public.class_join_attempts (
  user_id text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists class_join_attempts_user_idx on public.class_join_attempts (user_id, attempted_at);

-- ─── Membership checks (security definer: no policy recursion) ──────────────

create or replace function public.is_class_teacher(p_class uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.classes
    where id = p_class and teacher_id = public.requesting_user_id()
  )
$$;

create or replace function public.is_class_member(p_class uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_members
    where class_id = p_class and student_id = public.requesting_user_id()
  )
$$;

create or replace function public.is_assignment_teacher(p_assignment uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = p_assignment and c.teacher_id = public.requesting_user_id()
  )
$$;

-- True when the assignment is meant for the signed-in student
create or replace function public.is_assigned_to_me(p_assignment uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
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

-- Picked students must belong to the assignment's class
create or replace function public.is_member_of_assignment_class(p_assignment uuid, p_student text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    join public.class_members m on m.class_id = a.class_id
    where a.id = p_assignment and m.student_id = p_student
  )
$$;

-- ─── Joining with a code ────────────────────────────────────────────────────

-- Returns a status instead of raising, because an exception would also undo
-- the recorded attempt and the rate limit would never count failed codes.
-- status: joined | invalid_code | own_class | invalid_name | too_many_attempts
drop function if exists public.join_class(text, text);
create function public.join_class(p_code text, p_display_name text)
returns table (status text, class_id uuid, class_name text, teacher_name text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me text := public.requesting_user_id();
  code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  display text := btrim(regexp_replace(coalesce(p_display_name, ''), '\s+', ' ', 'g'));
  target public.classes%rowtype;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;

  -- At most 10 tries per hour, so codes cannot be guessed by trying many
  if (select count(*) from public.class_join_attempts a
      where a.user_id = me and a.attempted_at > now() - interval '1 hour') >= 10 then
    return query select 'too_many_attempts'::text, null::uuid, null::text, null::text;
    return;
  end if;
  insert into public.class_join_attempts (user_id) values (me);
  delete from public.class_join_attempts a where a.attempted_at < now() - interval '1 day';

  if display = '' or char_length(display) > 40 or display ~ '[<>{}]' then
    return query select 'invalid_name'::text, null::uuid, null::text, null::text;
    return;
  end if;

  select * into target from public.classes c where c.join_code = code;
  if target.id is null then
    return query select 'invalid_code'::text, null::uuid, null::text, null::text;
    return;
  end if;
  if target.teacher_id = me then
    return query select 'own_class'::text, target.id, target.name, target.teacher_name;
    return;
  end if;

  insert into public.class_members as m (class_id, student_id, display_name)
  values (target.id, me, display)
  on conflict on constraint class_members_pkey do nothing;

  return query select 'joined'::text, target.id, target.name, target.teacher_name;
end;
$$;

revoke all on function public.join_class(text, text) from public, anon;
grant execute on function public.join_class(text, text) to authenticated;

-- A new code for a class (when the old one was shared too widely). Runs as
-- the caller, so the classes policies decide whether it is their class.
create or replace function public.regenerate_join_code(p_class uuid)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  fresh text;
begin
  update public.classes set join_code = public.new_join_code()
  where id = p_class
  returning join_code into fresh;
  if fresh is null then
    raise exception 'not_your_class' using errcode = 'P0001';
  end if;
  return fresh;
end;
$$;

revoke all on function public.regenerate_join_code(uuid) from public, anon;
grant execute on function public.regenerate_join_code(uuid) to authenticated;

-- ─── Row level security ─────────────────────────────────────────────────────

alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_students enable row level security;
alter table public.lesson_attempts enable row level security;
alter table public.class_join_attempts enable row level security;

revoke all on public.classes, public.class_members, public.assignments,
  public.assignment_students, public.lesson_attempts, public.class_join_attempts
  from anon;
revoke all on public.class_join_attempts from authenticated;

-- Classes
drop policy if exists "classes: teacher and members read" on public.classes;
drop policy if exists "classes: teachers create their own" on public.classes;
drop policy if exists "classes: teacher edits" on public.classes;
drop policy if exists "classes: teacher deletes" on public.classes;

create policy "classes: teacher and members read"
  on public.classes for select to authenticated
  using (teacher_id = (select public.requesting_user_id()) or public.is_class_member(id));

create policy "classes: teachers create their own"
  on public.classes for insert to authenticated
  with check (teacher_id = (select public.requesting_user_id()) and (select public.is_teacher()));

create policy "classes: teacher edits"
  on public.classes for update to authenticated
  using (teacher_id = (select public.requesting_user_id()) and (select public.is_teacher()))
  with check (teacher_id = (select public.requesting_user_id()));

create policy "classes: teacher deletes"
  on public.classes for delete to authenticated
  using (teacher_id = (select public.requesting_user_id()));

-- The teacher may rename, change the subject and get a new code; nothing else
revoke update on public.classes from authenticated;
grant update (name, subject, join_code) on public.classes to authenticated;

-- Class members
drop policy if exists "members: self and teacher read" on public.class_members;
drop policy if exists "members: teacher sets support" on public.class_members;
drop policy if exists "members: leave or remove" on public.class_members;

create policy "members: self and teacher read"
  on public.class_members for select to authenticated
  using (student_id = (select public.requesting_user_id()) or public.is_class_teacher(class_id));

create policy "members: teacher sets support"
  on public.class_members for update to authenticated
  using (public.is_class_teacher(class_id))
  with check (public.is_class_teacher(class_id));

create policy "members: leave or remove"
  on public.class_members for delete to authenticated
  using (student_id = (select public.requesting_user_id()) or public.is_class_teacher(class_id));

-- Joining only through join_class(); only the support can be changed
revoke insert, update on public.class_members from authenticated;
grant update (support) on public.class_members to authenticated;

-- Assignments
drop policy if exists "assignments: teacher manages" on public.assignments;
drop policy if exists "assignments: students read their own" on public.assignments;

create policy "assignments: teacher manages"
  on public.assignments for all to authenticated
  using (public.is_class_teacher(class_id))
  with check (public.is_class_teacher(class_id) and created_by = (select public.requesting_user_id()));

create policy "assignments: students read their own"
  on public.assignments for select to authenticated
  using (public.is_assigned_to_me(id));

revoke update on public.assignments from authenticated;
grant update (due_date, message) on public.assignments to authenticated;

-- Picked students of an assignment
drop policy if exists "assignment students: teacher manages" on public.assignment_students;
drop policy if exists "assignment students: student reads own" on public.assignment_students;

create policy "assignment students: teacher manages"
  on public.assignment_students for all to authenticated
  using (public.is_assignment_teacher(assignment_id))
  with check (
    public.is_assignment_teacher(assignment_id)
    and public.is_member_of_assignment_class(assignment_id, student_id)
  );

create policy "assignment students: student reads own"
  on public.assignment_students for select to authenticated
  using (student_id = (select public.requesting_user_id()));

-- Lesson attempts
drop policy if exists "attempts: student records own" on public.lesson_attempts;
drop policy if exists "attempts: student reads own" on public.lesson_attempts;
drop policy if exists "attempts: student finishes own" on public.lesson_attempts;
drop policy if exists "attempts: teacher reads assignment lessons" on public.lesson_attempts;

create policy "attempts: student records own"
  on public.lesson_attempts for insert to authenticated
  with check (
    student_id = (select public.requesting_user_id())
    and public.is_assigned_to_me(assignment_id)
    and course_id = (select a.course_id from public.assignments a where a.id = assignment_id)
  );

create policy "attempts: student reads own"
  on public.lesson_attempts for select to authenticated
  using (student_id = (select public.requesting_user_id()));

create policy "attempts: student finishes own"
  on public.lesson_attempts for update to authenticated
  using (student_id = (select public.requesting_user_id()))
  with check (student_id = (select public.requesting_user_id()));

create policy "attempts: teacher reads assignment lessons"
  on public.lesson_attempts for select to authenticated
  using (public.is_assignment_teacher(assignment_id));

-- Only the end of a lesson can be filled in later
revoke update, delete on public.lesson_attempts from authenticated;
grant update (ended_at, seconds, end_reason) on public.lesson_attempts to authenticated;

-- ─── Tips analytics: the new pages ─────────────────────────────────────────

alter table public.onboarding_events
  drop constraint if exists onboarding_events_flow_check;
alter table public.onboarding_events
  add constraint onboarding_events_flow_check check (
    flow in ('welcome', 'home', 'courses', 'newCourse', 'lesson', 'profile', 'subscription',
             'signIn', 'notFound', 'legal', 'classes', 'classDetail', 'assign', 'join')
  );
