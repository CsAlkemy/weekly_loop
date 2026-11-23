import type { ReactNode } from "react";

export function ChartTooltip({
  leftPercent,
  children,
}: {
  leftPercent: number;
  children: ReactNode;
}) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute top-0 z-10 w-max max-w-60 -translate-x-1/2 rounded-xl border border-border bg-popover px-3 py-2 text-sm shadow-lg"
      style={{ left: `${Math.min(85, Math.max(15, leftPercent))}%` }}
    >
      {children}
    </div>
  );
}

export function LegendItem({ swatch, children }: { swatch: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {swatch}
      {children}
    </li>
  );
}
