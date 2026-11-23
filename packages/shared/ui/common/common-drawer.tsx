import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "../schadcn/sheet";

export interface CommonDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}

export function CommonDrawer({
  open,
  onOpenChange,
  title,
  description,
  className,
  children,
}: CommonDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn("w-[480px] max-w-full sm:max-w-[92vw]", className)}
        {...(description ? {} : { "aria-describedby": undefined })}
      >
        <div className="border-b border-border px-7 pb-5 pr-14 pt-7">
          <SheetTitle className="text-xl font-bold leading-tight">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="mt-1.5 text-[15px] text-muted-foreground">
              {description}
            </SheetDescription>
          ) : null}
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-7 py-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
