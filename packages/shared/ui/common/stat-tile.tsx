import type { ElementType, ReactNode } from "react";

import { cn } from "../lib/cn";
import { Card } from "../schadcn/card";
import { IconBox } from "./icon-box";
import { StatSkeleton } from "./skeleton/stat-skeleton";

interface StatTileProps {
  icon: ElementType<{ className?: string }>;
  label: string;
  value?: ReactNode;
  badge?: ReactNode;
  hint?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  className?: string;
}

export function StatTile({
  icon,
  label,
  value,
  badge,
  hint,
  footer,
  loading = false,
  className,
}: StatTileProps) {
  return (
    <Card className={cn("flex flex-col gap-5 p-6", className)}>
      <div className="flex items-center gap-3">
        <IconBox icon={icon} />
        <p className="text-[15px] font-semibold leading-snug">{label}</p>
      </div>
      {loading ? (
        <StatSkeleton />
      ) : (
        <div className="grid gap-1.5">
          <p className="flex flex-wrap items-center gap-2.5">
            <span className="text-4xl font-bold leading-none tracking-tight tabular-nums">
              {value}
            </span>
            {badge}
          </p>
          {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        </div>
      )}
      {footer ? <div className="mt-auto">{footer}</div> : null}
    </Card>
  );
}
