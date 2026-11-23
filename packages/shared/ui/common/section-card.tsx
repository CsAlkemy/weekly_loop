import type { ElementType, ReactNode } from "react";

import { cn } from "../lib/cn";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../schadcn/card";
import { IconBox } from "./icon-box";

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: ElementType<{ className?: string }>;
  action?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
}

export function SectionCard({
  title,
  description,
  icon,
  action,
  id,
  className,
  children,
}: SectionCardProps) {
  return (
    <Card id={id} className={cn("scroll-mt-24", className)}>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-x-5 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-64 items-start gap-3.5">
          {icon ? <IconBox icon={icon} /> : null}
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
