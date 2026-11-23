import { useRouter } from "next/router";

import { ListIcon, SidebarSimpleIcon } from "@phosphor-icons/react";

import type { User } from "@repo/library";

import { AccountMenu } from "@/components/layout/account-menu";
import { TeamSwitcher } from "@/components/layout/team-switcher";
import { pageTitle } from "@/lib/navigation";

interface AppHeaderProps {
  user: User;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileNav: () => void;
}

const ICON_BUTTON =
  "size-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

export function AppHeader({
  user,
  sidebarCollapsed,
  onToggleSidebar,
  onOpenMobileNav,
}: AppHeaderProps) {
  const router = useRouter();
  const title = pageTitle(router.pathname);

  return (
    <header className="sticky top-0 z-30 flex h-[76px] shrink-0 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onOpenMobileNav}
        className={`flex lg:hidden ${ICON_BUTTON}`}
      >
        <ListIcon aria-hidden className="size-6" />
      </button>
      <button
        type="button"
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-pressed={sidebarCollapsed}
        onClick={onToggleSidebar}
        className={`hidden lg:flex ${ICON_BUTTON}`}
      >
        <SidebarSimpleIcon aria-hidden className="size-6" />
      </button>

      {title ? <p className="hidden truncate text-base font-semibold sm:block">{title}</p> : null}

      <div className="ml-auto flex items-center gap-2">
        <TeamSwitcher />
        <AccountMenu user={user} />
      </div>
    </header>
  );
}
