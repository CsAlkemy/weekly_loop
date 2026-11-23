import type { ReactNode } from "react";

import { cn } from "../lib/cn";

const TONES = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-accent text-primary",
  success: "bg-success-soft text-success",
  danger: "bg-destructive-soft text-destructive",
  warning: "bg-warning-soft text-warning",
} as const;

export type PillTone = keyof typeof TONES;

interface PillProps {
  tone?: PillTone;
  className?: string;
  children: ReactNode;
}

export function Pill({ tone = "neutral", className, children }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
