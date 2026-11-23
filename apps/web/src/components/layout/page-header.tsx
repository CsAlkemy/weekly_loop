import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-4">
      <div className="mr-auto min-w-0">
        <h1 className="text-[30px] font-bold leading-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-[15px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

export const PAGE_CLASS =
  "mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8";
