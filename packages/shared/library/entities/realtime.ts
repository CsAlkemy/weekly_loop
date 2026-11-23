export type TeamEvent =
  { type: "connected"; now: string } | { type: "invalidate"; resource: string };
