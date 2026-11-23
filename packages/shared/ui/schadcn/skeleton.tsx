import * as React from "react";

import { cn } from "../lib/cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-foreground/[0.07]", className)} {...props} />
  );
}

export { Skeleton };
