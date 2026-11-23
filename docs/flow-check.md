# Flow check: who sees what, who does what

A walkthrough to check the data flow by hand, role by role. Every step below is also covered by an
automated test (named at the end of each section), so `sh scripts/test.sh` proves the same thing
unattended.

Open two or three browsers (or private windows) side by side and sign in as different people. Every
seeded user's password is `weekly-loop-demo`, or use "Use a demo account" on the sign-in page.

| Person                  | Role        | Teams                  | Can change data                        |
| ----------------------- | ----------- | ---------------------- | -------------------------------------- |
| Avery Admin (`avery@`)  | Admin       | every team             | yes, in every team; also manages users |
| Blake Brooks (`blake@`) | Team Member | Leadership, Sales      | yes, in those teams                    |
| Casey Cho (`casey@`)    | Team Member | Leadership             | yes                                    |
| Dana Diaz (`dana@`)     | Team Member | Leadership, Operations | yes                                    |
| Ellis Evans (`ellis@`)  | Observer    | Leadership             | no, read and join meetings only        |
| Finley Ford (`finley@`) | Team Member | Sales                  | yes, in Sales; refused in Leadership   |

## 1. A new Measurable reaches the whole team, and only that team

1. Blake: Scorecard → New measurable → "Demo calls booked", owner Casey, at least 12 → Add.
2. Casey and Ellis (already on the Scorecard): the row appears within a second, no reload.
3. Ellis: no "New measurable" button and the week cells are not editable.
4. Finley: open `/teams/team_lead/scorecard` by URL → "No access to this team".
5. Casey: type 14 in this week's cell → green "on track" for everyone, including Ellis.

Earlier weeks show "not entered", not "missed": a new Measurable starts this week.
Tests: `test_a_new_measurable_reaches_teammates_and_observers_but_not_other_teams`,
`a Measurable added by a Team Member appears live for an Observer`.

## 2. A missed week becomes an Issue, then To-Dos for named people

1. Blake: on New deals closed, week of Oct 26 (red), click the flag → Issue owned by Blake, marked
   "From scorecard".
2. Click the same flag again (or have Casey click it) → "Already on the Issues list"; no duplicate.
3. Ellis: sees the Issue; has no flag, Add To-Do or Solve buttons.
4. Dana: Add To-Do on that Issue → two rows: one for Casey, one for herself → Add 2 To-Dos.
5. To-Dos page for Casey, Dana and Ellis: both To-Dos, each with its owner, "from Issue: …", due
   in 7 days. Ellis's checkboxes are disabled. Observers are not offered as owners.

Tests: `test_an_off_track_score_becomes_an_issue_then_to_dos_for_named_people`,
`several To-Dos are added from an Issue at once, linked and due in 7 days`.

## 3. Who ticks a To-Do, and when, changes the score

The completion card scores **last week** (Nov 2–8) and counts a To-Do only if it was done
**before that week ended**.

1. Casey: To-Dos → Add To-Do (Testing) → owner Casey, due date **Nov 5** (last week). The card
   drops from 9 of 10 (90%) to 9 of 11 (82%): one more To-Do was due and is not done.
2. Casey ticks it now → still 82%: done late counts as not done. It stops being overdue.
3. Add another for Casey due **Nov 12** (this week) and tick it → last week's card does not move;
   it counts in this week's rate once the week closes (see "To-Do completion by week" on Overview).
4. Ellis cannot tick anything; Dana's ticks show up for Casey live.

Tests: `test_ticking_a_to_do_counts_only_when_done_within_its_week`,
`a To-Do added for a teammate reaches them live, and an Observer sees it read-only`.

## 4. A Rock's status and progress follow its Milestones

1. Avery: Rocks → Add Rock (Testing) → owner Dana, Milestones "Lease signed" due **Nov 10** and
   "Team hired" due Dec 15 → Add Rock.
2. Everyone on Leadership, Ellis included: the Rock shows **Off track, 0%** (a Milestone is past
   due and not done).
3. Avery or Dana: open the Rock and tick "Lease signed" → **On track, 50%** for everyone, live.
   Tick "Team hired" → 100%. Untick "Lease signed" → back to Off track.
4. Ellis sees the Milestones but has no checkboxes. Finley is refused the Leadership Rocks.

Tests: `test_a_rocks_status_and_progress_follow_its_milestones`,
`a Rock's progress and status move for everyone as Milestones are ticked`.

## 5. The meeting records who was there and what changed

1. Blake starts the Level 10 Meeting (he becomes the facilitator); Dana, Casey and Ellis join.
   Finley is refused. Ellis cannot start, advance, rate or end.
2. Blake: Next: IDS. Dana solves "Support coverage on weekends" with a note and adds a To-Do on
   "Hiring pipeline is slow". Blake's screen updates without a reload.
3. Blake: Next: Conclude. Blake rates 8, Casey 9 (average 8.5). Ellis sees "Observers do not rate."
4. Only Blake can end it. Everyone in the meeting lands on the summary: the Issue solved, the
   To-Do created, the four attendees and 8.5.

Tests: `test_a_meeting_records_who_was_there_and_what_they_changed`,
`the facilitator advances the agenda and a second browser follows`.

## 6. Users and roles

1. Avery: Settings → Users & roles → Add user (any email, a password, team Sales). Sign in as them in
   another browser → they see only Sales.
2. Avery: change them to Observer → their next click is read-only. Reset their password → they
   are signed out everywhere.
3. Anyone who is not an Admin: no Settings link, and the page says so if opened by URL.

Tests: `tests/test_users.py`, `tests/users.spec.ts`.

## Settings: test forms and reset

Admins have one **Settings** page (side nav, Admin group) with two tabs: Users & roles, and
Testing tools, which has two tools:

- **Turn on all test forms.** Shows "Add To-Do" on the To-Dos page, "Add Rock" on the Rocks page
  and the Milestone checkboxes, for everyone at once. They are off by default: the brief has To-Dos
  come only from Issues and Rocks only from the seed. They follow the same role rules (Admins and
  Team Members only, owners must be on the team). The walkthrough above needs them on.
- **Reset to seed data.** Replaces all data with the seed and restarts the clock at `APP_NOW`.
  People added on the Users & roles tab are removed and changed passwords go back to the seed
  password. The switch above keeps its position, and open pages refresh.

Both exist only while the API runs with `ENABLE_TEST_TOOLS=true`. It is off by default, so start
the app with `ENABLE_TEST_TOOLS=true docker compose up --build` for this walkthrough. When it is
off, the API refuses the switch, the reset and the test forms, and the tab says so. To remove the test forms for good, delete `apps/api/app/test_forms/`,
`apps/web/src/components/test-forms/`, `packages/shared/library/schema/test-form-schema.ts`,
`apps/api/tests/test_test_forms.py` and `apps/e2e/tests/flows.spec.ts`, then drop the references
the type checker points to.

Tests: `tests/test_settings.py`, `tests/settings.spec.ts`.
