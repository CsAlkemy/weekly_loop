import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";

import { Role } from "@repo/library";
import { cn, Skeleton, Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui";

import { useSession } from "@/hooks/use-auth";
import { useMeeting } from "@/hooks/use-meeting";
import { useTeams } from "@/hooks/use-teams";
import { ADMIN_NAVIGATION, meetingPath, teamNavigation, type NavItem } from "@/lib/navigation";

interface SidebarNavProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

function NavLink({
  item,
  active,
  live = false,
  collapsed,
  onNavigate,
}: SidebarNavProps & { item: NavItem; active: boolean; live?: boolean }) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "relative flex h-11 items-center gap-3 rounded-full px-4 text-[15px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "bg-accent font-semibold text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        collapsed && "mx-auto w-11 justify-center px-0",
      )}
    >
      <Icon aria-hidden weight={active ? "fill" : "regular"} className="size-5 shrink-0" />
      <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
      {live ? (
        <span
          className={cn(
            "size-2 shrink-0 rounded-full bg-success ring-2 ring-card",
            collapsed ? "absolute right-1.5 top-1.5" : "ml-auto",
          )}
        >
          <span className="sr-only">in progress</span>
        </span>
      ) : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function NavGroup({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1">
      {collapsed ? (
        <div aria-hidden className="mx-auto mb-2 h-px w-8 bg-border" />
      ) : (
        <p className="px-4 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

function TeamNav({ teamId, collapsed, onNavigate }: SidebarNavProps & { teamId: string }) {
  const router = useRouter();
  const { data: active } = useMeeting(teamId);
  const currentPath = router.asPath.split(/[?#]/)[0] ?? "";

  return (
    <>
      <NavGroup label="Team" collapsed={collapsed}>
        {teamNavigation(teamId).map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={currentPath === item.href || currentPath.startsWith(`${item.href}s/`)}
            live={item.href === meetingPath(teamId) && Boolean(active?.meeting)}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </NavGroup>
    </>
  );
}

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const router = useRouter();
  const { user } = useSession();
  const { data: teams } = useTeams();
  const routeTeamId = typeof router.query.teamId === "string" ? router.query.teamId : null;
  const routeTeamAllowed = !routeTeamId || Boolean(teams?.some((team) => team.id === routeTeamId));
  const teamId = routeTeamAllowed ? (routeTeamId ?? teams?.[0]?.id ?? null) : null;

  return (
    <div className={cn("grid", collapsed ? "gap-4" : "gap-7")}>
      {!teams ? (
        <div className="grid gap-2" role="status" aria-label="Loading">
          <Skeleton className="h-11 rounded-full" />
          <Skeleton className="h-11 rounded-full" />
        </div>
      ) : teamId ? (
        <TeamNav teamId={teamId} collapsed={collapsed} onNavigate={onNavigate} />
      ) : null}

      {user?.role === Role.ADMIN ? (
        <NavGroup label="Admin" collapsed={collapsed}>
          {ADMIN_NAVIGATION.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={router.pathname.startsWith(item.href)}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </NavGroup>
      ) : null}
    </div>
  );
}
