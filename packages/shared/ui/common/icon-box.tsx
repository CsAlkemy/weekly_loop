import type { ElementType } from "react";

import { cn } from "../lib/cn";

interface IconBoxProps {
  icon: ElementType<{ className?: string; weight?: "regular" | "fill" | "duotone" }>;
  className?: string;
}

export function IconBox({ icon: Icon, className }: IconBoxProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary",
        className,
      )}
    >
      <Icon weight="duotone" className="size-[22px]" />
    </span>
  );
}
