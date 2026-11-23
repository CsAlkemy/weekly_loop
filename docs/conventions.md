# Layout and conventions

```
apps/
  api/            FastAPI
    app/
      config/     environment settings
      common/     clock, week maths, enums, ids, base schema
      db/         SQLAlchemy models, session, setup helpers
      auth/       email and password sign-in, current user, team access, writer and admin guards
      users/      Admin-only user management: create, change role, teams, email, password
      rules/      rules.py (pure business rules) and report.py (rules report)
      teams/ rocks/ todos/ scorecard/ issues/ meetings/   one folder per feature:
                  service.py (queries and writes), schemas.py, router.py
      realtime/   WebSocket hub, one channel per team
      testing/    seed reset and clock routes, off unless ENABLE_TEST_ROUTES
    migrations/   Alembic
    tests/
  web/            Next.js (pages router)
    src/pages, src/components/<feature>, src/components/layout (app shell),
    src/hooks/use-<feature>.ts, src/lib
  e2e/            Playwright
packages/
  shared/library  API client, query hooks, entities, enums, zod schemas, formatters
  shared/ui       schadcn/ (raw shadcn components) and common/ (every shared component)
```

- **One code path per rule.** `rules.py` is called by the feature services, and the services are
  called by both the API and the rules report.
- **Shared components live in one place:** `packages/shared/ui/common`, imported from `@repo/ui`.
  `components/layout` holds only the app shell, which needs the router and session.
- **Forms** use `CommonForm`, which sets up react-hook-form with a zod resolver. Fields
  (`CommonInput`, `CommonSelect`, `CommonTextarea`) pick the form up from context, and
  `CommonFormSubmit` shows a spinner while submitting. Schemas live in
  `packages/shared/library/schema`.
- **Loading states** use the skeletons in `packages/shared/ui/common/skeleton`, one file per type.
- **Server state** lives in `src/hooks/use-<feature>.ts` (TanStack Query). Mutations are defined
  there; components pass `onSuccess`/`onError` per call.
- **Live updates:** `useTeamChannel` maps each `invalidate` message to a query key under
  `["teams", teamId, resource]`.
