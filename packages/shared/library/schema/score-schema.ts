import { z } from "zod";

export const scoreValueSchema = z
  .string()
  .trim()
  .min(1, "Enter a number")
  .regex(/^-?\d{1,8}(\.\d{1,4})?$/, "Enter a number with up to 4 decimals")
  .transform(Number);
