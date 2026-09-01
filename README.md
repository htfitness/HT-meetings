# HT Fitness Meetings

A meeting agenda and notes app for HT Fitness — keep every meeting group on
track, on time, and in one place.

## What it does

- **Multiple meeting groups** — Corporate Leadership, Managers, and Assistant
  Managers each get their own agenda template, meetings, notes, action items,
  decisions, topics, and transcripts. Users can belong to several groups and
  switch between them from the header.
- **Current Meeting** — run the meeting live: a "now discussing" banner with a
  per-section countdown timer (turns orange when you go over), section status
  (discussed / deferred / skipped), and quick capture of notes, decisions, and
  action items with owners and due dates.
- **Next Meeting Agenda** — create the next meeting from the group's master
  template, with suggested topics from **Next Meeting Topics** and anything
  deferred last week automatically carried into "Review Last Week".
- **Next Meeting Topics** — a running list anyone can add to during the week
  ("oh yeah, we need to talk about this").
- **Meeting History** — every past meeting with its full agenda, notes,
  decisions, action items, and uploaded Plaud transcripts (plain text).
- **My Action Items** — everything assigned to you across all groups, with
  due-date reminders on the Dashboard.
- **Search** — find anything across meetings, notes, decisions, action items,
  and transcripts.
- **Print / Export PDF** — a clean printable record of any meeting.
- **Admin** — invite users, reset passwords, create groups, manage memberships
  and per-group admins, and edit each group's master agenda template.

## Tech stack

- React 19 + Vite + Tailwind CSS (client)
- Express 4 (server, serves the built client in production)
- PostgreSQL via `pg` (schema auto-created on first boot — no migration step)
- Username/password auth with bcrypt + signed session cookies

## Local development

```bash
pnpm install
createdb htmeetings   # or any Postgres database
DATABASE_URL=postgresql://user:pass@localhost:5432/htmeetings \
SESSION_SECRET=any-long-random-string \
pnpm dev
```

Open http://localhost:3000 — the first visit walks you through creating the
admin account, then seed groups (Corporate Leadership, Managers, Assistant
Managers) are created automatically.

## Deploying to Render (about 10 minutes)

1. **Push this repo to GitHub** (or use Render's "Deploy from public Git
   repository" with this repo's URL).
2. In the Render dashboard: **New → Blueprint** and select the repo. Render
   reads `render.yaml` and provisions both the web service and the PostgreSQL
   database, wiring `DATABASE_URL` and generating `SESSION_SECRET`
   automatically.
3. Click **Apply**. The first deploy takes a few minutes; the database schema
   and default groups are created automatically on first boot.
4. Open your app URL, create the admin account, then invite Lisa, Jason,
   Amanda, and the rest of the team from the **Admin** page.

### Notes

- The `render.yaml` uses the `starter` web plan (always on) and `basic-256mb`
  database. You can change plans in the Render dashboard at any time.
- To use a free database instead, create a free Postgres at Neon, delete the
  `databases:` block from `render.yaml`, and set `DATABASE_URL` manually in
  the Render web service's Environment settings.
- Custom domain: Render dashboard → your service → Settings → Custom Domains.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server with Vite HMR on port 3000 |
| `pnpm build` | Build client + server into `dist/` |
| `pnpm start` | Run the production build |
| `pnpm check` | TypeScript type check |
| `pnpm test` | Vitest suite |
