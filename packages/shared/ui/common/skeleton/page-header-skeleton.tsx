import { cn } from "../../lib/cn";
import { Skeleton } from "../../schadcn/skeleton";

export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("flex items-center justify-between gap-4", className)}
    >
      <div className="grid gap-2">
        <Skeleton className="h-9 w-60" />
        <Skeleton className="h-3.5 w-64 max-w-full" />
      </div>
      <Skeleton className="h-11 w-44 shrink-0 rounded-full" />
    </div>
  );
}
