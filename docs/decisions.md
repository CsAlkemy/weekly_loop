# Decision record

The five decisions the brief leaves open (section 2.8), with their tradeoffs.

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

## 3. Real-time transport and meeting state

- **Transport: one WebSocket per team, used only to say "this changed".** All writes go through
  REST; the socket sends `{type: "invalidate", resource}` and clients refetch that resource. It is
  reached through the web app's own `/api` path, so the session cookie authorises it and the
  server checks team access and the `Origin` header. I chose this over pushing full state because
  there is one code path for reading data, and a missed message cannot leave a client wrong for
  long. Tradeoff: one extra request per change, and an in-process hub needs a single API worker
  (Postgres `LISTEN/NOTIFY` is the next step).
- **Ownership: the meeting is a Postgres row.** It holds the current section and
  `section_started_at`. One active meeting per team is a partial unique index, and advancing locks
  the row.
- **Timer: the server owns it.** Each response carries the server's `now`; clients tick locally
  from that and never from their own clock. Nothing advances automatically; an overrun only shows.
- **Recovery:** a late join, refresh or reconnect is the same request as any other read, so it
  gets the current state. A reconnect refetches the team's data.

## 4. No duplicate Issues under concurrency

A partial unique index on `(source_measurable_id, source_week_start) WHERE solved_at IS NULL`
makes a second unsolved Issue impossible. Make it an Issue runs `INSERT … ON CONFLICT DO NOTHING`
and, when nothing was inserted, selects the existing row. Two simultaneous requests both return the
same Issue (one 201, one 200). I preferred this to an application lock or `SELECT … FOR UPDATE`
because the database settles the race even with several API workers. Tested with 12 concurrent
requests and with two browsers clicking at once.

## 5. Keeping past meeting summaries unchanged

Today a summary is computed on read from the meeting's time window, which is what lets the two
seeded meetings have summaries. A later score edit would therefore change an old summary. To
freeze them I would write the computed summary as JSON to a `meeting_summaries` row inside the
transaction that ends the meeting, and serve that row when it exists. Seeded meetings would be
snapshotted once at seed time. Tradeoff: the snapshot duplicates data and needs a version field if
its shape changes, but history stops depending on mutable rows.
