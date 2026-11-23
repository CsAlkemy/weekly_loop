import { CheckIcon, ClockIcon, FlagIcon, type Icon as PhosphorIcon } from "@phosphor-icons/react";

import { MeasurableStatus } from "@repo/library";
import type { PillTone } from "@repo/ui";

export const SCORE_STATUS: Record<
  MeasurableStatus,
  {
    label: string;
    meaning: string;
    icon: PhosphorIcon;
    cell: string;
    swatch: string;
    tone: string;
    pill: PillTone;
  }
> = {
  [MeasurableStatus.ON_TRACK]: {
    label: "On track",
    meaning: "Goal met",
    icon: CheckIcon,
    cell: "bg-success-soft hover:brightness-[0.97]",
    swatch: "bg-success-soft ring-1 ring-success/30",
    tone: "text-success",
    pill: "success",
  },
  [MeasurableStatus.OFF_TRACK]: {
    label: "Off track",
    meaning: "Goal missed",
    icon: FlagIcon,
    cell: "bg-destructive-soft",
    swatch: "bg-destructive-soft ring-1 ring-destructive/30",
    tone: "text-destructive",
    pill: "danger",
  },
  [MeasurableStatus.PENDING]: {
    label: "Pending",
    meaning: "Not entered yet",
    icon: ClockIcon,
    cell: "bg-muted hover:bg-border",
    swatch: "bg-muted ring-1 ring-input",
    tone: "text-muted-foreground",
    pill: "neutral",
  },
};
