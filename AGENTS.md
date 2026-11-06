<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# eNvolve: project rules

eNvolve is a learning app for children with learning difficulties (students),
their teachers, and later admins. These rules apply to every change.

## 1. Every role sees only what its job needs

Before building or changing a page, answer these:

1. Which roles can open it? (student, teacher, admin; later a school admin)
2. What is each role's job on this page? Put only that on it.
3. If two roles do different things there, build two versions of the page.
   Do not build one shared page with parts hidden.
4. Give each role its own tips, written for that role: short and simple for
   children, brief and only where needed for adults (see section 2).
5. Check permissions in the page, in the server action and in the database
   policy (RLS). Hiding a menu item is not enough.

`lib/views.ts` is the single place that says which menu items each view
has and which pages belong to which view. The proxy (`proxy.ts`), the menus and the
pages all read it. To add a page or a role, extend it there first.

### The admin view

Admins are the people who run eNvolve. Their pages live under `/admin` and
on their own versions of `/` and `/my-profile`.

- Every admin page and action goes through `lib/admin/access.ts`: the admin
  role and two-step verification. In the database, `private.is_admin()`.
- Every admin decision is written to `admin_audit_log`, which nobody can
  change or delete. New kinds of decisions extend its `action` list.
- Admins see names and e-mails (from Clerk, not copied into our database),
  but lesson data only as totals, and never a conversation.
- The service role key (`lib/supabase-admin.ts`) is only for the automatic
  course check (`lib/moderation.ts`). Everything else uses the signed-in
  user's client and the policies.

### Lesson safety

The voice tutor only talks about the lesson's topic
(`supabase/migrations/20261107_lesson_safety.sql`, `docs/vapi-lesson-safety.md`).
It reports three kinds of event with its `jelentes` tool, which Vapi sends to
`/api/vapi/lesson-event` (checked with `VAPI_TOOL_SECRET`), then ends the call:
drift, violation and help.

- A call for help is never a rule break. It goes to the student's teacher with
  what to do next; admins see it with the student's name too
  (`20261110_admin_lesson_alerts.sql`), so it cannot go unnoticed. Drift is
  only a number for admins.
- Never store what was said: only the kind, the category and the time, for
  30 days. Teachers and admins see fixed, neutral texts per category.
- Every new voice call must be linked with `useLessonSafety().track()`; a call
  that cannot be linked is stopped.
- A report reaches the server two ways: Vapi's request to the webhook, and
  the browser's copy (`reportLessonEvent`, `20261109_lesson_report_backup.sql`).
  One event per call and kind, whichever comes first.
- Teachers see every stopped lesson of their students, from any lesson
  (assigned or not), one card each on the overview, most serious first
  (help, then rule breaks, then drift), and a bar under the menu on every
  page until they open it (`LessonAlertWatcher`). A student leaving by
  themselves stays in the class progress ("Figyelmet igényel"), not here.
  Colours: red = may be in danger, amber = rule break, blue = drift, always
  with an icon and a word. Admins get a card on their home page and a bar
  (`AdminSafetyCard`, `AdminSafetyBar`). Neither bar shows a name.
- A teacher can clear a stuck student with "Kezeltem" (`MarkHandledButton`,
  `20261111_teacher_handled.sql`): the latest attempt gets `teacher_ack_at`
  and stops counting as stuck until the next attempt. Clearing a stuck
  lesson also marks its lesson alert as seen, and the other way round.
  Students can never set those columns.
- Functions that return a table: cast every text column with `::text`. Some
  live columns are `varchar`, and PL/pgSQL rejects the mismatch at run time
  (`20261108_lesson_safety_fixes.sql`).
- The tutor ending the call reaches the browser as an "ejection" error; that
  is a normal end (`isNormalCallEnd` in `lib/vapi.sdk.ts`).

## 2. Tips and read-aloud on every page

Tips live in `lib/onboarding/tours.ts`, their texts under `Tour.<page>` in
`messages/*.json`.

- Tips never open by themselves. They run step by step when the user
  presses "Segítség" (Help). The only exception: on the home page, one
  bubble, once per account, points at the Help button (`intro` on
  `<PageTour>`). Children with learning difficulties should not be
  interrupted by bubbles they did not ask for.
- Students: every element they can see or use gets a tip. They are
  children, so nothing is left for them to guess.
- Teachers and admins: only what really needs explaining (statuses, what
  students see, privacy, irreversible actions). Obvious buttons get none.
- The menu and the Help button are explained on the home page only. The
  sign-in page has no tips.
- Every tip is recorded for read-aloud with `npm run speech:generate`;
  `npm run check:speech` lists the texts that have no recording yet.

## 3. Two languages, always together

Every text goes into both `messages/hu.json` and `messages/en.json`
(`npm run check:i18n`). Hungarian is the primary language.

## 4. Security and children's data

- Server actions can be called by any browser with any arguments. Each one
  checks who is signed in, checks the role where needed, and validates its
  input (`lib/validation.ts`).
- New tables get no access automatically ("Automatically expose new tables"
  is off in the Supabase Data API settings). Each migration that creates a
  table grants exactly what the app needs to `authenticated`, and nothing
  to `anon` unless signed-out visitors really need it.
- Every table has row level security. A change to a policy goes into a new
  file under `supabase/migrations/`, written so it is safe to run twice.
- Functions that run with owner rights (`security definer`) live in the
  `private` schema. When the app calls one, the `public` function is a thin
  `security invoker` wrapper around it (see 20261104_advisor_fixes.sql).
  This keeps the Supabase Security Advisor free of warnings.
- Store as little as possible. Teachers see lesson status, never the
  conversations.

## 5. Accessibility

The design must work for children with dyslexia, ADHD or autism. Use calm
colours and big targets. Never rely on colour alone. Every page must work
with the "Így kényelmes nekem" settings (larger text, easy-reading text,
less motion), from a 320 px phone up to a desktop screen.

## 6. Commits

Plain one-line commit messages, for example
`feat: teacher library with assign and preview`.
