-- Class accounts: students without an e-mail address (after 20261111).
--
-- A teacher creates accounts for their class: the server action makes a
-- Clerk user with a username and an easy password (no e-mail), and records
-- it here. The teacher prints a login card for each student (QR code,
-- username, password). Clerk is the source of truth for who a class account
-- belongs to: publicMetadata.classAccount = { classId, by } is set by our
-- server and cannot be changed from a browser. The QR card's key is stored
-- only as a hash, in Clerk's private metadata, never in this database.
--
-- Joining the class: the student's own first sign-in calls
-- claim_class_account() with the class id from that Clerk metadata. Only
-- then does the student become a class member, and joined_at is set. A row a
-- teacher inserts for somebody else's id therefore never puts that person in
-- their class, and deleting such a row never touches that person's data:
-- a full data deletion happens only for accounts that really signed in as
-- this class account (joined_at is not null).
--
-- Stored: the short name the teacher typed ("Lili K."), a small animal picture
-- to recognise the card by, who created it and when the student first signed
-- in. No e-mail, no full name, no password.
--
-- Safe to run more than once.

create table if not exists public.class_accounts (
  student_id text primary key check (student_id ~ '^user_[A-Za-z0-9]{10,64}$'),
  class_id uuid not null references public.classes (id) on delete cascade,
  created_by text not null default public.requesting_user_id(),
  display_name text not null check (char_length(display_name) between 1 and 40),
  animal text not null check (animal in (
    'fox', 'turtle', 'owl', 'cat', 'dog', 'rabbit', 'bear', 'lion',
    'frog', 'panda', 'koala', 'penguin', 'hedgehog', 'bee', 'fish', 'unicorn'
  )),
  created_at timestamptz not null default now(),
  joined_at timestamptz
);
create index if not exists class_accounts_class_idx on public.class_accounts (class_id);

alter table public.class_accounts enable row level security;
revoke all on public.class_accounts from anon, authenticated;
grant select, insert on public.class_accounts to authenticated;

drop policy if exists "class accounts: teacher reads own class" on public.class_accounts;
create policy "class accounts: teacher reads own class"
  on public.class_accounts for select to authenticated
  using (private.is_class_teacher(class_id));

drop policy if exists "class accounts: teacher creates for own class" on public.class_accounts;
create policy "class accounts: teacher creates for own class"
  on public.class_accounts for insert to authenticated
  with check (
    created_by = (select public.requesting_user_id())
    and private.is_class_teacher(class_id)
    and joined_at is null
  );

-- The student's own first sign-in: joins the class the account was made for.
-- status: ok | not_found
create or replace function private.claim_class_account(p_class uuid)
returns text language plpgsql volatile security definer set search_path = ''
as $$
declare
  me text := public.requesting_user_id();
  v_name text;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;

  update public.class_accounts
  set joined_at = coalesce(joined_at, now())
  where student_id = me and class_id = p_class
  returning display_name into v_name;
  if v_name is null then
    return 'not_found';
  end if;

  insert into public.class_members (class_id, student_id, display_name)
  values (p_class, me, v_name)
  on conflict do nothing;
  return 'ok';
end;
$$;

create or replace function public.claim_class_account(p_class uuid)
returns text language sql volatile security invoker set search_path = ''
as $$
  select private.claim_class_account(p_class)
$$;

-- The teacher renames a class account ("Lili K." to "Lili Kiss"), in the
-- account list and in the class. status: ok | not_found
create or replace function private.rename_class_account(p_student text, p_name text)
returns text language plpgsql volatile security definer set search_path = ''
as $$
declare
  me text := public.requesting_user_id();
  v_class uuid;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  if char_length(v_name) not between 1 and 40 then
    return 'not_found';
  end if;

  update public.class_accounts a
  set display_name = v_name
  where a.student_id = p_student and a.created_by = me and private.is_class_teacher(a.class_id)
  returning a.class_id into v_class;
  if v_class is null then
    return 'not_found';
  end if;

  update public.class_members
  set display_name = v_name
  where class_id = v_class and student_id = p_student;
  return 'ok';
end;
$$;

create or replace function public.rename_class_account(p_student text, p_name text)
returns text language sql volatile security invoker set search_path = ''
as $$
  select private.rename_class_account(p_student, p_name)
$$;

-- The teacher deletes a class account and everything it left behind. The
-- server action deletes the Clerk user after this. status: ok | not_found
create or replace function private.delete_class_account(p_student text)
returns text language plpgsql volatile security definer set search_path = ''
as $$
declare
  me text := public.requesting_user_id();
  v_row public.class_accounts%rowtype;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;

  select * into v_row
  from public.class_accounts a
  where a.student_id = p_student and a.created_by = me and private.is_class_teacher(a.class_id);
  if not found then
    return 'not_found';
  end if;

  if v_row.joined_at is null then
    -- Never signed in as this class account: nothing else can belong to it
    delete from public.class_members where class_id = v_row.class_id and student_id = p_student;
  else
    -- Signed in as this class account: remove all of its data
    delete from public.lesson_events e
      where e.call_id in (select lc.call_id from public.lesson_calls lc where lc.student_id = p_student);
    delete from public.lesson_calls where student_id = p_student;
    delete from public.lesson_attempts where student_id = p_student;
    delete from public.assignment_students where student_id = p_student;
    delete from public.class_members where student_id = p_student;
    delete from public.class_join_attempts where user_id = p_student;
    delete from public.bookmarks where user_id = p_student;
    delete from public.session_history where user_id = p_student;
    delete from public.course_reports where reporter = p_student;
    -- Courses the student built, unless a teacher has handed one out
    delete from public.courses c
      where c.author = p_student
        and not exists (select 1 from public.assignments a where a.course_id = c.id);
  end if;

  delete from public.class_accounts where student_id = p_student;
  return 'ok';
end;
$$;

create or replace function public.delete_class_account(p_student text)
returns text language sql volatile security invoker set search_path = ''
as $$
  select private.delete_class_account(p_student)
$$;

revoke all on function private.claim_class_account(uuid) from public, anon;
grant execute on function private.claim_class_account(uuid) to authenticated;
revoke all on function public.claim_class_account(uuid) from public, anon;
grant execute on function public.claim_class_account(uuid) to authenticated;

revoke all on function private.rename_class_account(text, text) from public, anon;
grant execute on function private.rename_class_account(text, text) to authenticated;
revoke all on function public.rename_class_account(text, text) from public, anon;
grant execute on function public.rename_class_account(text, text) to authenticated;

revoke all on function private.delete_class_account(text) from public, anon;
grant execute on function private.delete_class_account(text) to authenticated;
revoke all on function public.delete_class_account(text) from public, anon;
grant execute on function public.delete_class_account(text) to authenticated;
