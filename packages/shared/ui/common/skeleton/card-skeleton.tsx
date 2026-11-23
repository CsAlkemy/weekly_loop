import type { ReactNode } from "react";

import { Card, CardContent, CardHeader } from "../../schadcn/card";
import { Skeleton } from "../../schadcn/skeleton";
import { TextSkeleton } from "./text-skeleton";

export interface CardSkeletonProps {
  children?: ReactNode;
  className?: string;
}

export function CardSkeleton({ children, className }: CardSkeletonProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </CardHeader>
      <CardContent>{children ?? <TextSkeleton />}</CardContent>
    </Card>
  );
}
