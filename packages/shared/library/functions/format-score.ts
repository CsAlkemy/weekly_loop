import type { Goal } from "../entities/scorecard";
import { GoalType } from "../enum/goal-type";

export function formatScore(value: number, unit: string): string {
  const text = value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  if (unit === "%") return `${text}%`;
  if (unit.startsWith("$")) return `$${text}${unit.slice(1)}`;
  return text;
}

export function formatGoal(goal: Goal, unit: string): string {
  const suffix = unit === "%" || unit.startsWith("$") || unit === "count" ? "" : ` ${unit}`;
  const show = (value: number | null) => (value === null ? "" : formatScore(value, unit));

  switch (goal.type) {
    case GoalType.AT_LEAST:
      return `At least ${show(goal.value)}${suffix}`;
    case GoalType.AT_MOST:
      return `At most ${show(goal.value)}${suffix}`;
    case GoalType.EXACTLY:
      return `Exactly ${show(goal.value)}${suffix}`;
    case GoalType.BETWEEN:
      return `Between ${show(goal.min)} and ${show(goal.max)}${suffix}`;
  }
}
