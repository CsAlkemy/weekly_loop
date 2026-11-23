import type { User } from "./user";

export interface IssueSource {
  measurableId: string;
  measurableName: string;
  weekStart: string;
}

export interface Issue {
  id: string;
  title: string;
  details: string | null;
  owner: User;
  priority: number | null;
  createdAt: string;
  solvedAt: string | null;
  solvedBy: User | null;
  resolutionNote: string | null;
  source: IssueSource | null;
}

export type IssueStatus = "unsolved" | "solved";
