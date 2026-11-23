# Weekly Loop

A team's weekly operating loop in one place: Scorecard, Rocks, To-Dos, Issues and a live Level 10
Meeting. Next.js (pages router) + shadcn/ui, FastAPI, Postgres with Alembic migrations.

## Setup

```bash
docker compose up --build
```

- App: http://localhost:3000. Every seeded user's password is `weekly-loop-demo`: `avery@acme.test`
  (Admin), `blake@acme.test` (Team Member), `ellis@acme.test` (Observer), or click "Use a demo
  account". API docs (OpenAPI): http://localhost:8000/api/docs. Postgres: `localhost:5433`,
  `weekly`/`weekly`, database `weekly_loop`.
- The API migrates and loads `apps/api/seed/seed.json` on start (missing rows only). The clock
  starts at `APP_NOW` (default `2026-11-11T15:00:00Z`) and ticks. Busy port: `WEB_PORT=3100`.
- Testing tools (test forms to add To-Dos and Rocks, and Reset to seed data, under Settings) are off
  by default. Turn them on with `ENABLE_TEST_TOOLS=true docker compose up --build`.
- Without Docker: bun and uv, copy both `.env.example` files to `.env`, then `bun install`,
  `bun run --cwd apps/api migrate`, `bun run --cwd apps/api seed`, `bun run dev`.

## Rules report

```bash
docker compose run --rm api python -m app.rules.report > rules_report.json
```

Every section 2.6 value as JSON, computed on a scratch database that is migrated, seeded and
dropped. Add `-e APP_NOW=…` after `--rm` for another date. [rules_report.json](rules_report.json)
is the output at the default `APP_NOW`.

## Tests

```bash
sh scripts/test.sh
```

Unattended: starts the stack with the test routes on, runs pytest (rules with boundary cases, the
report, roles and team boundaries, database constraints, concurrent Make it an Issue) and Playwright
(two browsers in one meeting, live updates, every page). It changes the seeded data; run
`docker compose down -v` for a fresh app. Strategy: [docs/testing.md](docs/testing.md). A
role-by-role walkthrough: [docs/flow-check.md](docs/flow-check.md). A sample failure trace:
`bunx playwright show-trace apps/e2e/artifacts/sample-failure-trace.zip`.

## Design

Decision record (section 2.8, plus a note on 1,000 companies): [docs/decisions.md](docs/decisions.md).
Code layout: [docs/conventions.md](docs/conventions.md).

## Assumptions

- **Rules follow the data.** A To-Do counts for its week when `done_at` is before the week ends; a
  meeting has ended when it has an `ended_at`. Records after `APP_NOW` are not hidden.
- **To-Do completion** in the report includes the current week as the rate so far; the To-Dos page
  shows the last closed week and, separately, this week so far.
- **The report lists every Rock**; the Rocks page lists the current quarter's.
- **"During the meeting"** means `solved_at` or `created_at` is between `started_at` and
  `ended_at`, inclusive. **A meeting's scorecard week** is the last closed week at `started_at`.
- **Issue order ties** break by id. **To-Dos can be added to a solved Issue**, as the seed does.
- **Owners** of To-Dos and new Measurables are Admins or Team Members of the team. Anyone who can
  change a team can change any item in it (2.4), not only its owner; the app records who marked a
  To-Do done or solved an Issue.
- **One page per section** (Overview, Scorecard, Issues, To-Dos, Rocks, Meeting) instead of one
  long Team page, so the side nav links to pages.
- **Bonus items built:** no lost updates on scores and Issue priority (each save sends the value
  last seen as `expected`; a stale save gets 409 and the page shows the new value), Make it an
  Issue from an overdue To-Do or an off-track Rock (same no-duplicates rule), an activity log of
  who changed what (on the Overview), and the 1,000-companies note in the decision record.
- **Added on request, beyond the brief:** an Admin Settings page (Users & roles, and the testing
  tools), adding Measurables (a test form; they start this week, so earlier weeks are not missed), clearing a
  score, Issue details, a priority filter and sort, and a page per meeting summary with a Past meetings list (the brief leaves a meeting history page out; added on request). A user cannot
  become an Observer or leave a team while they own open items there.

## Known limitations

- Live updates go through Postgres `LISTEN/NOTIFY`, so the API runs several workers (two in
  Docker, `API_WORKERS`). An event sent while a worker's listener is reconnecting is missed; the
  browser refetches when its own connection comes back. The demo clock is shared in the database.
- Meeting summaries are frozen when a meeting ends (and at seed time for the seeded meetings).
- The activity log is written right after each change, not in the same transaction.
- "Observers own nothing" is enforced by the API, not a database constraint.
- Every seeded user shares one password, which "Use a demo account" hands out; set
  `DEMO_ACCOUNTS=false` outside a demo. No sign-up, password reset by email or user removal.
  Five wrong passwords lock that email for 15 minutes. Measurables cannot be edited or removed.
- Without `SESSION_SECRET` the API generates one and keeps it in `SESSION_SECRET_FILE` (a Docker
  volume), so a restart does not sign anyone out. Set `SESSION_COOKIE_SECURE=true` behind HTTPS.
- A role or team change applies on the user's next request; an open page keeps its buttons until
  it reloads. Lists are not paginated.

## AI tools

Claude Code (Anthropic's Claude) was used throughout: reading the brief and seed for edge cases,
scaffolding the monorepo, and writing the API, web app, tests and these documents. The business
rules were worked out by hand from the seed first, then checked against the generated report.
