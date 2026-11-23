import type { RockStatus } from "../enum/rock-status";
import type { User } from "./user";

export interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
  pastDue: boolean;
}

export interface Rock {
  id: string;
  title: string;
  owner: User;
  quarter: string;
  status: RockStatus;
  progressPercent: number;
  milestones: Milestone[];
}
