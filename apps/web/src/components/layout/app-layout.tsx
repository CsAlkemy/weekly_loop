import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar, MobileSidebar } from "@/components/layout/app-sidebar";
import { useSession } from "@/hooks/use-auth";
import { useSidebar } from "@/hooks/use-sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar();

  if (!user) return null;

  return (
    <div className="flex min-h-dvh bg-background">
      <AppSidebar collapsed={collapsed} />
      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          user={user}
          sidebarCollapsed={collapsed}
          onToggleSidebar={toggleCollapsed}
          onOpenMobileNav={() => setMobileOpen(true)}
        />
        {children}
      </div>
    </div>
  );
}
