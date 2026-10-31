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

1. Which roles can open it? (student, teacher, later admin)
2. What is each role's job on this page? Put only that on it.
3. If two roles do different things there, build two versions of the page.
   Do not build one shared page with parts hidden.
4. Give each role its own tips, written for that role: short and simple for
   children, brief and to the point for adults.
5. Check permissions in the page, in the server action and in the database
   policy (RLS). Hiding a menu item is not enough.

`lib/views.ts` is the single place that says which menu items each view
has and which pages belong to which view. The middleware, the menus and the
pages all read it. To add a page or a role, extend it there first.

## 2. Tips and read-aloud on every page

Every element a user can see or use gets a tip (`lib/onboarding/tours.ts`,
texts under `Tour.<page>` in `messages/*.json`). Students are children, so
nothing is left for them to guess. Every tip is recorded for read-aloud with
`npm run speech:generate`; `npm run check:speech` lists the texts that have
no recording yet.

## 3. Two languages, always together

Every text goes into both `messages/hu.json` and `messages/en.json`
(`npm run check:i18n`). Hungarian is the primary language.

## 4. Security and children's data

- Server actions can be called by any browser with any arguments. Each one
  checks who is signed in, checks the role where needed, and validates its
  input (`lib/validation.ts`).
- Every table has row level security. A change to a policy goes into a new
  file under `supabase/migrations/`, written so it is safe to run twice.
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
