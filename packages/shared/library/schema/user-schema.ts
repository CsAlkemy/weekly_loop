import { z } from "zod";

import { Role } from "../enum/role";
import { ROLE_LABELS } from "../functions/role-label";

export const ROLE_OPTIONS = [Role.ADMIN, Role.TEAM_MEMBER, Role.OBSERVER].map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

export const ROLE_SUMMARIES: Record<Role, string> = {
  [Role.ADMIN]:
    "Opens every team, does everything a Team Member can, and adds people and changes roles.",
  [Role.TEAM_MEMBER]:
    "Opens their own teams. Enters scores, adds and solves Issues, owns To-Dos and Rocks, and runs meetings.",
  [Role.OBSERVER]:
    "Opens their own teams to read along and can sit in on meetings. Cannot change anything.",
};

const name = z.string().trim().min(1, "Enter their name").max(120, "Keep it under 120 characters");
const email = z.string().trim().pipe(z.email("Enter a valid email"));
const role = z.enum([Role.ADMIN, Role.TEAM_MEMBER, Role.OBSERVER]);
const teamIds = z.array(z.string());

export const createUserSchema = z.object({
  name,
  email,
  role,
  teamIds,
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

export const editUserSchema = z.object({
  name,
  email,
  role,
  teamIds,
  password: z
    .string()
    .max(200)
    .refine((value) => value === "" || value.length >= 8, "Use at least 8 characters"),
});

export type CreateUserInput = z.output<typeof createUserSchema>;
export type EditUserInput = z.output<typeof editUserSchema>;
