import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";

import { Role } from "@repo/library";
import { CommonButton, cn } from "@repo/ui";

import { PAGE_CLASS, PageHeader } from "@/components/layout/page-header";
import { useSession } from "@/hooks/use-auth";
import { SETTINGS_TABS } from "@/lib/navigation";

interface SettingsShellProps {
  action?: ReactNode;
  children: ReactNode;
}

export function SettingsShell({ action, children }: SettingsShellProps) {
  const { user } = useSession();
  const { pathname } = useRouter();

  if (user?.role !== Role.ADMIN) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-bold">Only Admins can open Settings</h1>
        <p className="text-muted-foreground">Ask an Admin if someone needs an account.</p>
        <CommonButton asChild variant="outline">
          <Link href="/teams">Back to your teams</Link>
        </CommonButton>
      </main>
    );
  }

  return (
    <main className={PAGE_CLASS}>
      <PageHeader title="Settings" subtitle="People, roles and tools for trying out the app.">
        {action}
      </PageHeader>
      <nav
        aria-label="Settings"
        className="flex w-fit max-w-full flex-wrap rounded-full bg-muted p-1"
      >
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon aria-hidden className="size-[18px]" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </main>
  );
}
