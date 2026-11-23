import { cn } from "../../lib/cn";
import { Skeleton } from "../../schadcn/skeleton";

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 6, className }: TableSkeletonProps) {
  const template = {
    gridTemplateColumns: `minmax(8rem, 1.5fr) repeat(${columns}, minmax(0, 1fr))`,
  };

  return (
    <div role="status" aria-label="Loading" className={cn("grid gap-3 overflow-hidden", className)}>
      <div className="grid gap-3 border-b border-border pb-3" style={template}>
        <Skeleton className="h-3 w-20" />
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} className="h-3 w-10 justify-self-center" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="grid items-center gap-3" style={template}>
          <Skeleton className={cn("h-3.5", row % 2 === 0 ? "w-3/4" : "w-3/5")} />
          {Array.from({ length: columns }, (_, column) => (
            <Skeleton key={column} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}
