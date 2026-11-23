import { z } from "zod";

import { GoalType } from "../enum/goal-type";

export const UNIT_OPTIONS = [
  { value: "count", label: "Number" },
  { value: "%", label: "Percent (%)" },
  { value: "$", label: "Dollars ($)" },
  { value: "$k", label: "Thousands of dollars ($k)" },
  { value: "hours", label: "Hours" },
];

export const GOAL_TYPE_OPTIONS = [
  { value: GoalType.AT_LEAST, label: "At least" },
  { value: GoalType.AT_MOST, label: "At most" },
  { value: GoalType.EXACTLY, label: "Exactly" },
  { value: GoalType.BETWEEN, label: "Between" },
];

const NUMBER = /^-?\d{1,8}(\.\d{1,4})?$/;

export const createMeasurableSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name the number you track")
      .max(120, "Keep it under 120 characters"),
    ownerId: z.string().min(1, "Pick an owner"),
    unit: z.enum(["count", "%", "$", "$k", "hours"]),
    goalType: z.enum([GoalType.AT_LEAST, GoalType.AT_MOST, GoalType.EXACTLY, GoalType.BETWEEN]),
    goalValue: z.string().trim(),
    goalMin: z.string().trim(),
    goalMax: z.string().trim(),
  })
  .superRefine((values, ctx) => {
    const check = (field: "goalValue" | "goalMin" | "goalMax") => {
      const ok = NUMBER.test(values[field]);
      if (!ok) ctx.addIssue({ code: "custom", path: [field], message: "Enter a number" });
      return ok;
    };

    if (values.goalType !== GoalType.BETWEEN) {
      check("goalValue");
      return;
    }
    const bothOk = [check("goalMin"), check("goalMax")].every(Boolean);
    if (bothOk && Number(values.goalMin) > Number(values.goalMax)) {
      ctx.addIssue({
        code: "custom",
        path: ["goalMax"],
        message: "Must not be below the lower number",
      });
    }
  })
  .transform(({ name, ownerId, unit, goalType, goalValue, goalMin, goalMax }) => ({
    name,
    ownerId,
    unit,
    goal:
      goalType === GoalType.BETWEEN
        ? { type: goalType, value: null, min: Number(goalMin), max: Number(goalMax) }
        : { type: goalType, value: Number(goalValue), min: null, max: null },
  }));

export type CreateMeasurableInput = z.output<typeof createMeasurableSchema>;
