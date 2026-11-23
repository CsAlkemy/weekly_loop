import Link from "next/link";
import type { ReactNode } from "react";

import { canWrite, isApiError, type TeamDetail } from "@repo/library";
import { CardSkeleton, CommonButton, PageHeaderSkeleton } from "@repo/ui";

import { LiveIndicator } from "@/components/layout/live-indicator";
import { PAGE_CLASS, PageHeader } from "@/components/layout/page-header";
import { useSession } from "@/hooks/use-auth";
import { useTeamChannel } from "@/hooks/use-realtime";
import { useTeam } from "@/hooks/use-teams";

interface TeamPageProps {
  teamId: string;
  title?: string;
  subtitle: (team: TeamDetail) => string;
  children: (team: TeamDetail) => ReactNode;
}

export function TeamPage({ teamId, title, subtitle, children }: TeamPageProps) {
  const { user } = useSession();
  const { data: team, error, isLoading } = useTeam(teamId);
  const live = useTeamChannel(team?.id);

  if (isLoading) {
    return (
      <main className={PAGE_CLASS}>
        <PageHeaderSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </main>
    );
  }

  if (error || !team) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-bold">
          {isApiError(error) && error.status === 403 ? "No access to this team" : "Team not found"}
        </h1>
        <p className="text-muted-foreground">{error?.message}</p>
        <CommonButton asChild variant="outline">
          <Link href="/teams">Back to your teams</Link>
        </CommonButton>
      </main>
    );
  }

  return (
    <main className={PAGE_CLASS}>
      <PageHeader
        title={title ?? team.name}
        subtitle={`${subtitle(team)}${user && !canWrite(user.role) ? " · you have read-only access" : ""}`}
      >
        <LiveIndicator live={live} />
      </PageHeader>
      {children(team)}
    </main>
  );
}
