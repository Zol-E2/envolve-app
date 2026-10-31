-- Admin view, first round: course moderation, reports and the admin log.
--
-- Who may do what (enforced here, whatever the app or a browser sends):
--   * Admin = the Clerk session token carries app_role "admin" (set by the
--     project owner; see scripts/set-role.mjs and the Users page).
--   * New courses start in "review": only the author (and classes it is
--     assigned to) can see them. The app runs an automatic content check and
--     makes the course public with the service role key. Signed-in users can
--     never set a course's visibility or featured flag themselves; a trigger
--     resets any attempt.
--   * Anyone who can see a course may report it (report_course(), rate
--     limited). One report from a teacher, or three from students, takes a
--     public course back to "review" until an admin decides.
--   * Admins decide with admin_moderate_course(), which also writes the
--     admin log. The log cannot be changed or deleted, not even by admins.
--
-- Safe to run more than once.

-- ─── Helpers ────────────────────────────────────────────────────────────────

create or replace function private.is_admin()
returns boolean language sql stable set search_path = ''
as $$
  select coalesce(public.requesting_app_role() = 'admin', false)
$$;

-- A course handed out in one of my classes (as its teacher or a member), so
-- a course still in review keeps working for the class it was assigned to
create or replace function private.course_via_my_class(p_course uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.course_id = p_course
      and (
        c.teacher_id = public.requesting_user_id()
        or exists (
          select 1 from public.class_members m
          where m.class_id = a.class_id and m.student_id = public.requesting_user_id()
        )
      )
  )
$$;

-- ─── Courses: visibility and featured ───────────────────────────────────────

-- Existing courses stay public (the column is added with that default), new
-- ones start in review (the default changes right after)
alter table public.courses add column if not exists visibility text not null default 'public';
alter table public.courses add column if not exists review_reason text;
alter table public.courses add column if not exists featured boolean not null default false;
alter table public.courses alter column visibility set default 'review';
alter table public.courses alter column review_reason set default 'unchecked';

alter table public.courses drop constraint if exists courses_visibility_check;
alter table public.courses add constraint courses_visibility_check
  check (visibility in ('public', 'review', 'hidden'));
alter table public.courses drop constraint if exists courses_review_reason_check;
alter table public.courses add constraint courses_review_reason_check
  check (review_reason is null or review_reason in ('unchecked', 'filter', 'reports'));

create index if not exists courses_visibility_created_idx
  on public.courses (visibility, created_at desc);

-- Signed-in users (the "authenticated" role) cannot set the moderation
-- fields: on insert they get the defaults, on update they keep their old
-- values. Changing the name or topic of a public course sends it back to
-- review. The admin functions (owner rights) and the service role pass.
create or replace function private.guard_course_moderation()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.visibility := 'review';
      new.review_reason := 'unchecked';
      new.featured := false;
    else
      new.visibility := old.visibility;
      new.review_reason := old.review_reason;
      new.featured := old.featured;
      if old.visibility = 'public'
         and (new.name, new.topic) is distinct from (old.name, old.topic) then
        new.visibility := 'review';
        new.review_reason := 'unchecked';
        new.featured := false;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists courses_guard_moderation on public.courses;
create trigger courses_guard_moderation
  before insert or update on public.courses
  for each row execute function private.guard_course_moderation();

-- Who can see a course: public ones, your own, ones handed out in your
-- classes while they are in review, and admins everything
drop policy if exists "courses: signed-in users read the library" on public.courses;
drop policy if exists "courses: read public, own, assigned; admins all" on public.courses;
create policy "courses: read public, own, assigned; admins all"
  on public.courses for select to authenticated
  using (
    (select public.requesting_user_id()) is not null
    and (
      visibility = 'public'
      or author = (select public.requesting_user_id())
      or (select private.is_admin())
      or (visibility = 'review' and private.course_via_my_class(id))
    )
  );

-- ─── Reports ────────────────────────────────────────────────────────────────

create table if not exists public.course_reports (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  reporter text not null,
  -- teachers and admins: one report is enough to take a course back to review
  reporter_is_adult boolean not null default false,
  reason text not null check (reason in ('inappropriate', 'wrong', 'other')),
  note text check (note is null or char_length(note) <= 300),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_by text,
  resolved_at timestamptz,
  unique (course_id, reporter)
);
create index if not exists course_reports_open_idx on public.course_reports (course_id) where status = 'open';
create index if not exists course_reports_reporter_idx on public.course_reports (reporter, created_at desc);

alter table public.course_reports enable row level security;
revoke all on public.course_reports from anon, authenticated;
grant select on public.course_reports to authenticated;

drop policy if exists "reports: admins read" on public.course_reports;
create policy "reports: admins read"
  on public.course_reports for select to authenticated
  using ((select private.is_admin()));

-- Returns a status instead of raising, like join_class().
-- status: reported | already | own_course | not_found | invalid | too_many
create or replace function public.report_course(p_course uuid, p_reason text, p_note text default null)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me text := public.requesting_user_id();
  adult boolean := coalesce(public.requesting_app_role() in ('teacher', 'admin'), false);
  clean_note text := nullif(btrim(regexp_replace(coalesce(p_note, ''), '\s+', ' ', 'g')), '');
  target public.courses%rowtype;
  adult_reports int;
  child_reports int;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  if p_reason is null or p_reason not in ('inappropriate', 'wrong', 'other') then
    return 'invalid';
  end if;
  if clean_note is not null and (char_length(clean_note) > 300 or clean_note ~ '[<>{}]') then
    return 'invalid';
  end if;

  -- Only a course you can see (the same rule as the select policy)
  select * into target from public.courses c where c.id = p_course;
  if target.id is null
     or target.visibility = 'hidden'
     or not (target.visibility = 'public' or target.author = me or private.course_via_my_class(target.id)) then
    return 'not_found';
  end if;
  if target.author = me then
    return 'own_course';
  end if;

  -- At most 10 reports an hour, so one account cannot flood the list
  if (select count(*) from public.course_reports r
      where r.reporter = me and r.created_at > now() - interval '1 hour') >= 10 then
    return 'too_many';
  end if;

  insert into public.course_reports (course_id, reporter, reporter_is_adult, reason, note)
  values (target.id, me, adult, p_reason, clean_note)
  on conflict (course_id, reporter) do nothing;
  if not found then
    return 'already';
  end if;

  select count(*) filter (where r.reporter_is_adult), count(*) filter (where not r.reporter_is_adult)
    into adult_reports, child_reports
  from public.course_reports r
  where r.course_id = target.id and r.status = 'open';

  if target.visibility = 'public' and (adult_reports >= 1 or child_reports >= 3) then
    update public.courses
    set visibility = 'review', review_reason = 'reports', featured = false
    where id = target.id;
  end if;

  return 'reported';
end;
$$;

revoke all on function public.report_course(uuid, text, text) from public, anon;
grant execute on function public.report_course(uuid, text, text) to authenticated;

-- ─── Admin log ──────────────────────────────────────────────────────────────

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor text not null,
  action text not null check (action in (
    'role_change', 'course_public', 'course_hidden', 'course_featured', 'course_unfeatured', 'course_deleted'
  )),
  target_type text not null check (target_type in ('user', 'course')),
  target_id text not null,
  target_label text check (target_label is null or char_length(target_label) <= 200),
  detail text check (detail is null or char_length(detail) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
-- No update or delete for anyone: the log only grows
grant select, insert on public.admin_audit_log to authenticated;

drop policy if exists "audit: admins read" on public.admin_audit_log;
create policy "audit: admins read"
  on public.admin_audit_log for select to authenticated
  using ((select private.is_admin()));

-- Role changes happen in Clerk, so the app writes their line itself; course
-- decisions are logged by admin_moderate_course() below
drop policy if exists "audit: admins log role changes" on public.admin_audit_log;
create policy "audit: admins log role changes"
  on public.admin_audit_log for insert to authenticated
  with check (
    (select private.is_admin())
    and actor = (select public.requesting_user_id())
    and action = 'role_change'
    and target_type = 'user'
  );

-- ─── Admin decisions on a course ────────────────────────────────────────────

-- p_action: public | hidden | featured | unfeatured | deleted
-- status: ok | not_found | not_public | invalid
create or replace function public.admin_moderate_course(p_course uuid, p_action text, p_note text default null)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me text := public.requesting_user_id();
  clean_note text := nullif(btrim(regexp_replace(coalesce(p_note, ''), '\s+', ' ', 'g')), '');
  target public.courses%rowtype;
begin
  if not private.is_admin() or me is null then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('public', 'hidden', 'featured', 'unfeatured', 'deleted') then
    return 'invalid';
  end if;
  if clean_note is not null and char_length(clean_note) > 300 then
    return 'invalid';
  end if;

  select * into target from public.courses c where c.id = p_course for update;
  if target.id is null then
    return 'not_found';
  end if;

  if p_action = 'public' then
    update public.courses set visibility = 'public', review_reason = null where id = target.id;
  elsif p_action = 'hidden' then
    update public.courses set visibility = 'hidden', review_reason = null, featured = false where id = target.id;
  elsif p_action = 'featured' then
    if target.visibility <> 'public' then
      return 'not_public';
    end if;
    update public.courses set featured = true where id = target.id;
  elsif p_action = 'unfeatured' then
    update public.courses set featured = false where id = target.id;
  end if;

  -- A decision closes the open reports (deleting removes them with the course)
  if p_action in ('public', 'hidden') then
    update public.course_reports
    set status = 'resolved', resolved_by = me, resolved_at = now()
    where course_id = target.id and status = 'open';
  end if;

  insert into public.admin_audit_log (actor, action, target_type, target_id, target_label, detail)
  values (me, 'course_' || p_action, 'course', target.id::text, left(target.name, 200), clean_note);

  if p_action = 'deleted' then
    delete from public.courses where id = target.id;
  end if;

  return 'ok';
end;
$$;

revoke all on function public.admin_moderate_course(uuid, text, text) from public, anon;
grant execute on function public.admin_moderate_course(uuid, text, text) to authenticated;

-- ─── Numbers for the admin overview ─────────────────────────────────────────

-- Totals only: no names, no single lessons
create or replace function public.admin_stats()
returns table (
  public_courses int,
  review_courses int,
  hidden_courses int,
  open_reports int,
  active_students_week int,
  lessons_week int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return query
  select
    (select count(*)::int from public.courses where visibility = 'public'),
    (select count(*)::int from public.courses where visibility = 'review'),
    (select count(*)::int from public.courses where visibility = 'hidden'),
    (select count(distinct course_id)::int from public.course_reports where status = 'open'),
    (select count(distinct user_id)::int from public.session_history where created_at > now() - interval '7 days'),
    (select count(*)::int from public.session_history where created_at > now() - interval '7 days');
end;
$$;

revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ─── Tips analytics: the admin pages ────────────────────────────────────────

alter table public.onboarding_events
  drop constraint if exists onboarding_events_flow_check;
alter table public.onboarding_events
  add constraint onboarding_events_flow_check check (
    flow in ('welcome', 'home', 'courses', 'newCourse', 'lesson', 'profile', 'subscription',
             'signIn', 'notFound', 'legal', 'classes', 'classDetail', 'assign', 'join',
             'teacherWelcome', 'teacherHome', 'library', 'lessonPreview', 'teacherProfile', 'newCourseTeacher',
             'adminHome', 'adminUsers', 'adminCourses', 'adminLog', 'adminProfile', 'adminPreview')
  );
