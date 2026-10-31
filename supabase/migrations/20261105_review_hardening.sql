-- Pre-merge review.
--
-- 1. A lesson's result can only be written once, and only as long as the
--    lesson really lasted.
--
-- Until now a student's browser could update its own lesson attempt again
-- and again, with any number of seconds (the app never did, but the API
-- allowed it). Teachers read "done" or "stuck" from these numbers, so:
--   * an attempt can only be finished while it is still open;
--   * the recorded seconds cannot exceed the time since the lesson started
--     (with two minutes to spare for slow connections).
--
-- 2. The daily limit on new courses (20 per person, LIMITS.coursesPerDay in
--    lib/validation.ts) was only checked by the app. A browser talking to
--    the API directly could skip it, so the database checks it too.
--
-- Safe to run more than once.

drop policy if exists "attempts: student finishes own" on public.lesson_attempts;
create policy "attempts: student finishes own"
  on public.lesson_attempts for update to authenticated
  using (
    student_id = (select public.requesting_user_id())
    and ended_at is null
  )
  with check (
    student_id = (select public.requesting_user_id())
    and (seconds is null or seconds <= extract(epoch from (now() - started_at)) + 120)
  );

-- ─── 2. New courses: at most 20 per person per day ──────────────────────────

create index if not exists courses_author_created_idx on public.courses (author, created_at desc);

create or replace function private.guard_course_moderation()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      if (select count(*) from public.courses c
          where c.author = new.author and c.created_at > now() - interval '1 day') >= 20 then
        raise exception 'too_many_courses' using errcode = '54000';
      end if;
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

-- ─── 3. requesting_user_id(): signed-in users only ──────────────────────────
-- Signed-out visitors (anon) never need it: no policy for them calls it.
-- The policies run it as the signed-in user, so "authenticated" keeps it.

revoke all on function public.requesting_user_id() from public, anon;
grant execute on function public.requesting_user_id() to authenticated;
