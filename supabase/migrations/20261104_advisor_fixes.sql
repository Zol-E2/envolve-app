-- Supabase Security Advisor follow-up for the class and admin functions.
--
-- 1. "Signed-In Users Can Execute SECURITY DEFINER Function": join_class,
--    report_course, admin_moderate_course and admin_stats run with owner
--    rights. Their bodies move to the private schema (not exposed by the
--    API); the public functions the app calls become thin wrappers that run
--    with the caller's rights and only call the private ones. The checks
--    inside (signed in, admin role, rate limits) are unchanged.
-- 2. class_join_attempts gets a primary key, and an explicit policy that
--    nobody may read or write it directly (only join_class() uses it).
-- 3. Indexes for the foreign keys the advisor listed.
--
-- Safe to run more than once.

-- ─── 1. Owner-rights bodies in the private schema ───────────────────────────

create or replace function private.join_class(p_code text, p_display_name text)
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

revoke all on function private.join_class(text, text) from public, anon;
grant execute on function private.join_class(text, text) to authenticated;

create or replace function private.report_course(p_course uuid, p_reason text, p_note text default null)
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

revoke all on function private.report_course(uuid, text, text) from public, anon;
grant execute on function private.report_course(uuid, text, text) to authenticated;

create or replace function private.admin_moderate_course(p_course uuid, p_action text, p_note text default null)
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

revoke all on function private.admin_moderate_course(uuid, text, text) from public, anon;
grant execute on function private.admin_moderate_course(uuid, text, text) to authenticated;

create or replace function private.admin_stats()
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

revoke all on function private.admin_stats() from public, anon;
grant execute on function private.admin_stats() to authenticated;


-- ─── Public wrappers with the caller's rights ───────────────────────────────
-- Same names and arguments as before, so the app does not change.

create or replace function public.join_class(p_code text, p_display_name text)
returns table (status text, class_id uuid, class_name text, teacher_name text)
language sql
volatile
security invoker
set search_path = ''
as $$
  select * from private.join_class(p_code, p_display_name)
$$;
revoke all on function public.join_class(text, text) from public, anon;
grant execute on function public.join_class(text, text) to authenticated;

create or replace function public.report_course(p_course uuid, p_reason text, p_note text default null)
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.report_course(p_course, p_reason, p_note)
$$;
revoke all on function public.report_course(uuid, text, text) from public, anon;
grant execute on function public.report_course(uuid, text, text) to authenticated;

create or replace function public.admin_moderate_course(p_course uuid, p_action text, p_note text default null)
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.admin_moderate_course(p_course, p_action, p_note)
$$;
revoke all on function public.admin_moderate_course(uuid, text, text) from public, anon;
grant execute on function public.admin_moderate_course(uuid, text, text) to authenticated;

create or replace function public.admin_stats()
returns table (
  public_courses int,
  review_courses int,
  hidden_courses int,
  open_reports int,
  active_students_week int,
  lessons_week int
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.admin_stats()
$$;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;


-- ─── 2. class_join_attempts ─────────────────────────────────────────────────

alter table public.class_join_attempts add column if not exists id bigint generated always as identity;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.class_join_attempts'::regclass and contype = 'p'
  ) then
    alter table public.class_join_attempts add primary key (id);
  end if;
end;
$$;

drop policy if exists "join attempts: no direct access" on public.class_join_attempts;
create policy "join attempts: no direct access"
  on public.class_join_attempts for all to authenticated
  using (false) with check (false);

-- ─── 3. Indexes for foreign keys ────────────────────────────────────────────

create index if not exists assignments_course_idx on public.assignments (course_id);
create index if not exists lesson_attempts_course_idx on public.lesson_attempts (course_id);
create index if not exists session_history_course_idx on public.session_history (course_id);
-- A full index instead of the partial one, so it also covers the foreign key
create index if not exists course_reports_course_idx on public.course_reports (course_id);
drop index if exists public.course_reports_open_idx;
