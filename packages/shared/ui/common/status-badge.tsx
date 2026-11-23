import { RockStatus } from "@repo/library";

import { cn } from "../lib/cn";
import { Pill, type PillTone } from "./pill";

const STATUS_STYLES: Record<RockStatus, { label: string; tone: PillTone; dot: string }> = {
  [RockStatus.ON_TRACK]: { label: "On track", tone: "success", dot: "bg-success" },
  [RockStatus.OFF_TRACK]: { label: "Off track", tone: "danger", dot: "bg-destructive" },
  [RockStatus.COMPLETE]: { label: "Complete", tone: "primary", dot: "bg-primary" },
};

export function StatusBadge({ status, className }: { status: RockStatus; className?: string }) {
  const { label, tone, dot } = STATUS_STYLES[status];

  return (
    <Pill tone={tone} className={className}>
      <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />
      {label}
    </Pill>
  );
}
