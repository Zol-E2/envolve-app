# eNvolve

A voice-first learning app for children with learning difficulties (autism,
ADHD, dyslexia), with a student view, a teacher view and an admin view.
Hungarian first, English too.

- **Next.js 16** (App Router, `proxy.ts`), **next-intl** (hu/en)
- **Clerk** for sign-in and roles, **Supabase** (Postgres + row level security)
- **Vapi** for the voice lessons, **ElevenLabs** for the read-aloud tips
- **Sentry** for errors, **Vercel** for hosting, Web Analytics and Speed Insights

Project rules (roles, tips, two languages, security, accessibility, commits)
are in [AGENTS.md](AGENTS.md). Read them before changing anything.

## Getting started

Node.js 22 or 24 (see `engines` in package.json).

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

## Environment variables

`.env.example` lists every variable with a short note. Never commit real
values; `.env*` files are ignored by git (except the example).

## Database

Run the files in `supabase/migrations/` in the Supabase SQL editor, in name
order. Every file is safe to run more than once. Afterwards, check the
Security Advisor: it should show no warnings.

## Roles

Everyone starts as a student. Admins give the teacher or admin role on the
Users page; the very first admin is set from the command line:

```bash
npm run role:set -- someone@example.com admin
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint, translation check and read-aloud check |
| `npm run speech:generate` | Records new or changed tips with ElevenLabs (commit the results) |
| `npm run role:set -- <email> <role>` | Shows or changes someone's role |
