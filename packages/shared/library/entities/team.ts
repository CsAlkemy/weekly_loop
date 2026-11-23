import type { User } from "./user";

export interface Team {
  id: string;
  name: string;
}

export interface TeamDetail extends Team {
  timezone: string;
  members: User[];
}
