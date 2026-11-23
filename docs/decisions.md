# Decision record

The five decisions left open in section 2.8, with tradeoffs, and a note on 1,000 companies.

## 1. Data model and source links

- **Weeks and due dates are `DATE`s in company time; instants are `timestamptz` in UTC.** A week is
  its Monday, bounded by localising Monday 00:00 in the company zone, so a daylight-saving week is
  169 hours. Tradeoff: every rule needs the zone, so rules are pure functions of `(data, now, zone)`.
- **Sources are typed columns with foreign keys**, not a generic `source_type`/`source_id` pair the
  database cannot check. An Issue comes from a score (`source_measurable_id` + `source_week_start`),
  a To-Do (`source_todo_id`) or a Rock (`source_rock_id`), with a check that at most one is set. A
  To-Do has `source_issue_id`. Tradeoff: each new kind of source costs a column and an index.
- **Team boundaries are in the keys.** Issues and To-Dos carry `team_id`, and source links are
  composite foreign keys, so a row cannot point at another team's row.
- **Constraints, not just code:** one score per Measurable and week, Monday weeks, priority 1–5,
  rating 1–10, a note on every solved Issue. Each change writes an `activity` row (the audit trail).

## 2. API design

REST under `/api/teams/{team_id}/…`. One dependency checks team access and every query filters by
team, so another team's id returns 403 or 404; a second refuses Observer writes. Changes that are
not plain updates are verbs (`/solve`, `/done`, `/meeting/advance`). JSON is camelCase; OpenAPI is
at `/api/docs`. Tradeoff: longer paths, and the client must know the team.

**Lost updates.** Saving a score or an Issue's priority sends `expected`, the value last seen. The
server locks the row, compares, and answers 409 if it changed; the page refetches. I compared values
rather than versions because a cleared score has no row to hold one. Tradeoff: a change and a
change back (8 → 12 → 8) goes unnoticed, which loses nothing the person did not see.

## 3. Real-time transport and meeting state

- **Transport:** one WebSocket per team that only says "this changed"; writes go through REST and
  clients refetch. The session cookie authorises it, and the server checks team access and `Origin`.
  Workers share events through Postgres `LISTEN/NOTIFY`. Chosen over pushing state: one read path,
  and a missed message cannot leave a client wrong for long. Tradeoff: an extra request per change.
- **Ownership:** the meeting is a Postgres row holding the section and `section_started_at`. A
  partial unique index allows one active meeting per team; advancing locks the row.
- **Timer:** the server owns it. Responses carry the server's `now` and clients tick from that, never
  their own clock. An overrun shows; nothing advances by itself.
- **Recovery:** a late join, refresh or reconnect is an ordinary read, so it gets the current state.

## 4. No duplicate Issues under concurrency

A partial unique index per source, such as `(source_measurable_id, source_week_start) WHERE
solved_at IS NULL`, makes a second unsolved Issue impossible. Make it an Issue runs `INSERT … ON
CONFLICT DO NOTHING` and otherwise returns the existing row (201 versus 200), so the database
settles the race across workers, which an application lock would not. Tested with 12 concurrent
requests and two browsers; overdue To-Dos and off-track Rocks follow the same rule.

## 5. Keeping past meeting summaries unchanged

Ending a meeting writes its summary as JSON to `meeting_summaries` in the same transaction, and the
summary page serves that row; seeded meetings are frozen at seed time. Tradeoff: duplicated data and
a version field if the shape changes, but history no longer depends on rows that keep changing
(tested: editing a score afterwards leaves the summary unchanged).

## 6. Supporting 1,000 companies

- **Isolation:** users and teams carry `company_id`, and access is company-scoped (tested). Next:
  Postgres row-level security on `company_id` as a second guard.
- **Size:** about 50,000 users and a few million rows a year fit one Postgres. Add `(team_id,
  due_date)` on To-Dos and `(team_id, solved_at)` on Issues, and paginate the lists.
- **Live updates and demo parts:** Redis pub/sub replaces `LISTEN/NOTIFY` if busy. `APP_NOW`
  becomes the real clock; reset to seed and the seed password stay off (`ENABLE_TEST_TOOLS`,
  `DEMO_ACCOUNTS`).
