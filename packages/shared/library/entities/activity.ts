import type { User } from "./user";

export interface ActivityEntry {
  id: number;
  actor: User;
  action: string;
  summary: string;
  at: string;
}
