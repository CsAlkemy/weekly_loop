# Decision record

The five decisions the brief leaves open (section 2.8), with their tradeoffs, and a note on
supporting 1,000 companies.

## 1. Data model and source links

- **Weeks and due dates are `DATE`s in company time; instants are `timestamptz` in UTC.** A week is
  its Monday. Week bounds come from localising Monday 00:00 with the company zone, so the week
  holding the daylight-saving change is 169 hours long. Tradeoff: every rule needs the zone passed
  in, which is why the rules are pure functions of `(data, now, zone)`.
- **An Issue's source is two typed columns**, `source_measurable_id` and `source_week_start`, with
  a foreign key. A To-Do has `source_issue_id`. I rejected a generic `source_type`/`source_id`
  pair: it is more flexible but the database cannot check it. Adding a Rock or To-Do source later
  means another nullable column and index, not a rewrite.
- **Team boundaries are in the keys.** Issues and To-Dos carry `team_id`, and their source links
  are composite foreign keys, so a row cannot point at another team's Measurable or Issue.
- **Seed ids are the primary keys** (`u1`, `t12`); new rows get prefixed random ids.
- **Constraints, not just code:** scores are unique per Measurable and week and must be a Monday,
  priority is 1 to 5, rating is 1 to 10, a solved Issue needs a note, only attendees can rate.

## 2. API design

REST, with every resource under `/api/teams/{team_id}/…`. One dependency checks team access and
every query filters by team, so a guessed id from another team returns 403 or 404 without special
cases. A second dependency refuses Observer writes. State changes that are not plain updates are
verbs (`/solve`, `/done`, `/meeting/advance`). JSON is camelCase; OpenAPI docs are generated at
`/api/docs`. Tradeoff: nested paths are longer, and a client must know the team to reach an item.

**Lost updates (bonus).** Saving a score or an Issue's priority sends the value the person last saw
as `expected`. The server locks the Measurable or Issue row, compares, and answers 409 with the new
value in the message when they differ; the page then shows the new value. I compared values rather
than adding a version column because a cleared score has no row to carry a version, and for a
single number "is it still what I saw" is exactly the question. Tradeoff: a change and a change back
(8 → 12 → 8) between load and save is not noticed, which loses nothing the person did not see.

## 3. Real-time transport and meeting state

- **Transport: one WebSocket per team, used only to say "this changed".** All writes go through
  REST; the socket sends `{type: "invalidate", resource}` and clients refetch that resource. It is
  reached through the web app's own `/api` path, so the session cookie authorises it and the
  server checks team access and the `Origin` header. I chose this over pushing full state because
  there is one code path for reading data, and a missed message cannot leave a client wrong for
  long. Each API process delivers to its own sockets and forwards the event through Postgres
  `LISTEN/NOTIFY`, so several workers stay in sync (Docker runs two). Tradeoff: one extra request
  per change, and an event sent while a listener reconnects is missed until that browser refetches.
- **Ownership: the meeting is a Postgres row.** It holds the current section and
  `section_started_at`. One active meeting per team is a partial unique index, and advancing locks
  the row.
- **Timer: the server owns it.** Each response carries the server's `now`; clients tick locally
  from that and never from their own clock. Nothing advances automatically; an overrun only shows.
- **Recovery:** a late join, refresh or reconnect is the same request as any other read, so it
  gets the current state. A reconnect refetches the team's data.

## 4. No duplicate Issues under concurrency

A partial unique index on `(source_measurable_id, source_week_start) WHERE solved_at IS NULL`
makes a second unsolved Issue impossible; overdue To-Dos and off-track Rocks use the same pattern
with their own partial unique index and typed source column. Make it an Issue runs `INSERT … ON CONFLICT DO NOTHING`
and, when nothing was inserted, selects the existing row. Two simultaneous requests both return the
same Issue (one 201, one 200). I preferred this to an application lock or `SELECT … FOR UPDATE`
because the database settles the race even with several API workers. Tested with 12 concurrent
requests and with two browsers clicking at once.

## 5. Keeping past meeting summaries unchanged

Built: ending a meeting writes its computed summary as JSON to a `meeting_summaries` row in the
same transaction, and the summary page serves that row. Seeded meetings are snapshotted at seed
time, and a meeting ended before this existed is snapshotted on first read. Tradeoff: the snapshot
duplicates data and needs a version field if its shape changes, but history no longer depends on
mutable rows (tested: editing a score afterwards leaves the summary unchanged).

## 6. Supporting 1,000 companies (bonus note)

The model is already multi-company: every user and team has a `company_id`, and every team-scoped
row carries `team_id`, so one database can hold many companies.

- **Isolation.** Team access, team lists and user management are scoped to the user's company; an
  Admin of one company is refused another company's team (tested). The next step is Postgres
  row-level security on `company_id` as a second guard against a missed filter.
- **Size.** At about 10 teams and 50 users a company, that is 50,000 users and a few million scores
  and To-Dos a year: small for one Postgres. Reads are per team and use the `team_id` indexes;
  I would add `(team_id, due_date)` on To-Dos and `(team_id, solved_at)` on Issues, and page the
  lists, which today are not paginated.
- **Live updates.** Already fanned out through Postgres `LISTEN/NOTIFY` across workers and
  instances; Redis pub/sub is the step up if it gets busy. Messages carry no data, so a lost one
  costs a refresh at worst.
- **Time.** Each company keeps its own time zone, which every rule already takes. The demo clock
  (`APP_NOW`) becomes the real clock.
- **Computed values.** Rates and statuses are computed on read per team, which stays cheap at this
  size. Meeting summaries would be frozen when a meeting ends (section 5) so history is not
  recomputed.
- **What goes.** Reset to seed data truncates every table and the shared seed password signs in
  every seeded user; both are demo tools behind `ENABLE_TEST_TOOLS` and `DEMO_ACCOUNTS`, off for a
  real deployment.
