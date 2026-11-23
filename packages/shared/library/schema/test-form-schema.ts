import { z } from "zod";

import { RockStatus } from "../enum/rock-status";

const title = z.string().trim().min(1, "Give it a title").max(200, "Keep it under 200 characters");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

export const ROCK_STATUS_OPTIONS = [
  { value: RockStatus.ON_TRACK, label: "On track" },
  { value: RockStatus.OFF_TRACK, label: "Off track" },
  { value: RockStatus.COMPLETE, label: "Complete" },
];

export const createTodoSchema = z
  .object({
    title,
    ownerId: z.string().min(1, "Pick an owner"),
    dueDate: z.union([z.literal(""), isoDate]),
  })
  .transform(({ dueDate, ...rest }) => ({ ...rest, dueDate: dueDate || null }));

export const createRockSchema = z.object({
  title,
  ownerId: z.string().min(1, "Pick an owner"),
  status: z.enum([RockStatus.ON_TRACK, RockStatus.OFF_TRACK, RockStatus.COMPLETE]),
  milestones: z.array(z.object({ title, dueDate: isoDate })).max(12),
});

export type CreateTodoInput = z.output<typeof createTodoSchema>;
export type CreateRockInput = z.output<typeof createRockSchema>;
