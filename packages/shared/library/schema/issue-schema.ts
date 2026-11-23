import { z } from "zod";

export const NO_PRIORITY = "none";

export const PRIORITY_OPTIONS = [
  { value: "5", label: "5 · Highest" },
  { value: "4", label: "4 · High" },
  { value: "3", label: "3 · Medium" },
  { value: "2", label: "2 · Low" },
  { value: "1", label: "1 · Lowest" },
  { value: NO_PRIORITY, label: "No priority" },
];

const title = z.string().trim().min(1, "Give it a title").max(200, "Keep it under 200 characters");

export const createIssueSchema = z.object({
  title,
  details: z.string().trim().max(2000, "Keep it under 2000 characters"),
  priority: z
    .enum([NO_PRIORITY, "1", "2", "3", "4", "5"])
    .transform((value) => (value === NO_PRIORITY ? null : Number(value))),
});

export type CreateIssueInput = z.output<typeof createIssueSchema>;

export const solveIssueSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, "Say how it was resolved")
    .max(2000, "Keep it under 2000 characters"),
});

export type SolveIssueInput = z.output<typeof solveIssueSchema>;

export const addTodoSchema = z.object({
  title,
  ownerId: z.string().min(1, "Pick an owner"),
});

export type AddTodoInput = z.output<typeof addTodoSchema>;

export const MAX_TODOS_AT_ONCE = 10;

export const addTodosSchema = z.object({
  todos: z.array(addTodoSchema).min(1).max(MAX_TODOS_AT_ONCE),
});

export type AddTodosInput = z.output<typeof addTodosSchema>;
