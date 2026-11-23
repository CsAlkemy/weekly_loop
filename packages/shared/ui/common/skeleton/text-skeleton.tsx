import { cn } from "../../lib/cn";
import { Skeleton } from "../../schadcn/skeleton";

const LINE_WIDTHS = ["w-full", "w-11/12", "w-4/5", "w-2/3"];

export interface TextSkeletonProps {
  lines?: number;
  className?: string;
}

export function TextSkeleton({ lines = 3, className }: TextSkeletonProps) {
  return (
    <div role="status" aria-label="Loading" className={cn("grid gap-2", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "h-3.5",
            index === lines - 1 && lines > 1 ? "w-1/2" : LINE_WIDTHS[index % LINE_WIDTHS.length],
          )}
        />
      ))}
    </div>
  );
}
