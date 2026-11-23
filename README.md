# Weekly Loop

One place for a team's weekly operating loop: Measurables, Rocks, To-Dos, Issues and a live
Level 10 Meeting. Next.js + shadcn/ui + Tailwind, FastAPI, Postgres with Alembic migrations.

## Setup

```bash
docker compose up --build
```

- App: http://localhost:3000. Sign in with a seeded email and the password `weekly-loop-demo`
  (`SEED_PASSWORD`). Try `avery@acme.test` (Admin), `blake@acme.test` (Team Member) or
  `ellis@acme.test` (Observer); every seeded email is the first name at `acme.test`. Or click
  "Use a demo account" under the form to pick one and sign in with a click.
- API docs (OpenAPI): http://localhost:8000/api/docs
- Postgres: `localhost:5433`, user and password `weekly`, database `weekly_loop`

The API container applies migrations and loads `apps/api/seed/seed.json` on every start. The seed
only inserts missing rows, so it is safe to rerun. The clock starts at `APP_NOW` (default
`2026-11-11T15:00:00Z`); set it to start elsewhere: `APP_NOW=2026-11-18T15:00:00Z docker compose up`.
If port 3000 is taken, pick another for the app: `WEB_PORT=3100 docker compose up --build`.

Without Docker: install [bun](https://bun.sh) and [uv](https://docs.astral.sh/uv/), copy
`apps/api/.env.example` and `apps/web/.env.example` to `.env`, then run `bun install`,
`bun run --cwd apps/api migrate`, `bun run --cwd apps/api seed` and `bun run dev`.

## Rules report

```bash
docker compose run --rm api python -m app.rules.report > rules_report.json
```

Prints every computed value from section 2.6 as JSON for the current `APP_NOW`. It builds its own
scratch database (migrate, seed, report, drop), so the output is always for a freshly seeded
database. For another date add `-e APP_NOW=2026-11-18T15:00:00Z` after `--rm`. The committed
[rules_report.json](rules_report.json) is the output at the default `APP_NOW`.

## Tests

```bash
sh scripts/test.sh
```

One unattended command: it starts the stack, then runs the API suite (pytest) and the Playwright
suite in a container. The run turns on the test-only routes and changes the seeded data; for a
fresh app afterwards run `docker compose down -v` and `docker compose up`.

- **Rule tests** (`apps/api/tests/test_rules*.py`): every 2.6 rule with boundary cases, and the
  report on the seed and at other dates.
- **API tests** (`apps/api/tests/`): a Team Member refused on another team, Observer writes
  refused, concurrent Make it an Issue returning one Issue, and the database constraints.
- **End-to-end** (`apps/e2e/tests/`): two browsers in one meeting (`meeting.spec.ts`), live
  updates between browsers, and every page section.

Fixture and clock strategy: [docs/testing.md](docs/testing.md). A by-hand walkthrough of who
sees and changes what is in [docs/flow-check.md](docs/flow-check.md). It uses test forms to add
To-Dos and Rocks, which an Admin turns on in Settings; the same page resets all data to the seed.
Both need `ENABLE_TEST_TOOLS=true`, on in `docker-compose.yml` for now. A sample failure artifact
(Playwright trace) is in `apps/e2e/artifacts/`; open it with
`bunx playwright show-trace apps/e2e/artifacts/sample-failure-trace.zip`.

## Design

The decision record for section 2.8 is [docs/decisions.md](docs/decisions.md). Code layout and
frontend conventions are in [docs/conventions.md](docs/conventions.md).

## Assumptions

- **Rules follow the data, not the clock.** A To-Do counts for its week when `done_at` is before
  that week's end, and a meeting is "ended" when it has an `ended_at`. Records dated after
  `APP_NOW` are not hidden.
- **To-Do completion includes the current week** in the report, as the rate so far.
- **The report lists every Rock** of a team; the Team page lists the current quarter's.
- **"During the meeting"** means `solved_at` or `created_at` falls between the meeting's
  `started_at` and `ended_at`, inclusive. The seed has no other link.
- **A meeting's scorecard week** is the last closed week at its `started_at`.
- **Issue order ties** (same priority and creation time) break by id.
- **To-Do owners** must be members of the team with the Admin or Team Member role. An Admin who
  is not a member can still act in the team.
- **Anyone who can change a team can change any item in it**, not only the owner, as 2.4 says:
  a facilitator ticks To-Dos and solves Issues during the meeting. Seeded done To-Dos and solved
  Issues have no name, since the seed does not record one.
- **To-Dos can be added to a solved Issue**, as the seed does (`t20`, `t30`).
- **The running clock ticks** forward from `APP_NOW` so the meeting timer can run. The rules
  report and tests freeze it.
- **The Team page is split** into an Overview and one page each for the Scorecard, Issues,
  To-Dos and Rocks, so the side nav links to pages rather than sections of one long page.
- **Additions beyond the brief:** clearing a score, optional details on an Issue (not editable
  after it is added), the name of whoever marked a To-Do done or solved an Issue, a priority filter and sort on the Issue list (the numbers keep showing
  meeting order), a page per meeting summary, and an Admin-only
  Settings page with two tabs: Users & roles (add people, change role, teams, email or password)
  and Testing tools (test forms switch, reset to seed data), and a New measurable button on the Scorecard. The brief lists user and Measurable management as out of scope; both
  were added on request. A new Measurable starts this week, so earlier weeks are not counted as
  missed. A user cannot become an Observer, or leave a
  team, while they own open items there.

## Known limitations

- The clock restarts from `APP_NOW` whenever the API process restarts.
- Live updates use an in-process hub, so the API must run as a single worker.
- Meeting summaries are computed on read; freezing them is described, not built.
- Scores and Issue priority are last-save-wins, with no lost-update protection.
- "Observers cannot own anything" is enforced by the API, not by a database constraint.
- Sign-in is email and password (scrypt hashes) with a signed session cookie. Every seeded user
  shares one password, which the "Use a demo account" list hands to the browser; set
  `DEMO_ACCOUNTS=false` outside a demo. There is no sign-up, self-service password reset, login rate limit, or way
  to remove a user.
- Measurables can be added but not edited or removed.
- Sessions are tied to the password, so an Admin's password reset signs that user out everywhere.
  Without `SESSION_SECRET` the API picks a random one at start, which signs everyone out on a
  restart; set it for a real deployment, along with HTTPS (the cookie is not marked Secure).
- A role or team change applies on the user's next request. Their open page still shows the old
  buttons until it reloads, and an open live connection keeps receiving change notices (never
  data) until it reconnects.
- Lists are not paginated.

## AI tools

Claude Code (Anthropic's Claude) was used throughout: reading the brief and seed for edge cases,
scaffolding the monorepo, and writing the API, web app, tests and these documents. The business
rules were first worked out by hand from the seed and then checked against the generated report.
