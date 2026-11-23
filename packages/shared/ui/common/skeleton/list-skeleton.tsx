import { cn } from "../../lib/cn";
import { Skeleton } from "../../schadcn/skeleton";

export interface ListSkeletonProps {
  rows?: number;
  avatar?: boolean;
  trailing?: boolean;
  className?: string;
}

export function ListSkeleton({
  rows = 4,
  avatar = false,
  trailing = true,
  className,
}: ListSkeletonProps) {
  return (
    <ul role="status" aria-label="Loading" className={cn("divide-y divide-border", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-center gap-3 py-4">
          {avatar ? <Skeleton className="size-10 shrink-0 rounded-full" /> : null}
          <div className="grid min-w-0 flex-1 gap-2">
            <Skeleton className={cn("h-4", index % 2 === 0 ? "w-2/5" : "w-1/2")} />
            <Skeleton className={cn("h-3", index % 2 === 0 ? "w-1/4" : "w-1/5")} />
          </div>
          {trailing ? <Skeleton className="h-5 w-20 shrink-0 rounded-full" /> : null}
        </li>
      ))}
    </ul>
  );
}
