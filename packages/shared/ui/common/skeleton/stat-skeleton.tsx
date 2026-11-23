import { cn } from "../../lib/cn";
import { Skeleton } from "../../schadcn/skeleton";

export function StatSkeleton({ className }: { className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cn("grid gap-2", className)}>
      <Skeleton className="h-9 w-24" />
      <Skeleton className="h-4 w-36" />
    </div>
  );
}
