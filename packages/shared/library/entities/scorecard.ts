import type { GoalType } from "../enum/goal-type";
import type { MeasurableStatus } from "../enum/measurable-status";
import type { User } from "./user";

export interface Goal {
  type: GoalType;
  value: number | null;
  min: number | null;
  max: number | null;
}

export interface ScoreCell {
  weekStart: string;
  value: number | null;
  status: MeasurableStatus;
  issueId: string | null;
}

export interface Measurable {
  id: string;
  name: string;
  owner: User;
  unit: string;
  goal: Goal;
  cells: ScoreCell[];
}

export interface Scorecard {
  weeks: string[];
  currentWeek: string;
  lastClosedWeek: string;
  measurables: Measurable[];
}
