import Link from "next/link";

import { cn, Sheet, SheetContent, SheetTitle, TooltipProvider } from "@repo/ui";

import { Wordmark } from "@/components/layout/logo-mark";
import { SidebarNav } from "@/components/layout/sidebar-nav";

interface SidebarContentProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

function SidebarContent({ collapsed = false, onNavigate }: SidebarContentProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full flex-col">
        <div
          className={cn(
            "flex h-[76px] shrink-0 items-center px-6",
            collapsed && "justify-center px-0",
          )}
        >
          <Link
            href="/teams"
            aria-label="Weekly Loop home"
            onClick={onNavigate}
            className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-4"
          >
            <Wordmark collapsed={collapsed} />
          </Link>
        </div>

        <nav
          aria-label="Primary"
          className={cn("flex-1 overflow-y-auto px-4 py-4", collapsed && "px-2")}
        >
          <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
        </nav>
      </div>
    </TooltipProvider>
  );
}

export function AppSidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 border-r border-border bg-card transition-[width] duration-200 ease-out lg:block",
        collapsed ? "w-20" : "w-72",
      )}
    >
      <SidebarContent collapsed={collapsed} />
    </aside>
  );
}

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" aria-describedby={undefined} className="w-80 lg:hidden">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarContent onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
