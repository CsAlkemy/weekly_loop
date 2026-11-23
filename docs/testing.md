# Fixture and clock strategy

## Clock

Nothing reads the system clock directly. `APP_NOW` is where the app's clock starts.

- **API tests and the rules report freeze it** at `APP_NOW` (`APP_CLOCK=frozen`), so every result
  is deterministic. Tests that need another moment override the clock dependency with the
  `set_now` fixture, for example to check that a Milestone due today is past due tomorrow.
- **The running server ticks** forward from `APP_NOW`, so a meeting timer can run. Each API start
  begins at `APP_NOW` or the latest recorded activity, whichever is later, so a stopped stack never
  drifts; the API workers share the clock through the database.
- **Playwright** restores the seed and restarts the clock before each test through
  `POST /api/testing/reset`. `POST /api/testing/clock/advance` moves the clock, which is how the
  overrun test works. Both routes are only mounted when `ENABLE_TEST_ROUTES=true`; a test checks
  they are absent by default.

## Fixtures

- **API tests** run against a real Postgres database named by `TEST_DATABASE_URL`. The suite
  creates it if missing, migrates it once, then truncates and reseeds before every test. They use
  the real seed file, so expected values match the brief's answer key.
- **Rule tests** are pure: they build model objects in memory and need no database.
- **Concurrency tests** send requests in parallel through separate sessions, so the database, not
  the test, decides the race.
- **End-to-end tests** run one at a time against the real stack and reset the data before each.
  Two-browser tests use two separate browser contexts signed in as different users.

## Failure artifacts

Playwright keeps a trace for every failed test in `apps/e2e/test-results/`. A sample from a
deliberately failing test is committed at `apps/e2e/artifacts/sample-failure-trace.zip`.
