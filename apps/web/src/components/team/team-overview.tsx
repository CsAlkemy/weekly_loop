import Link from "next/link";
import type { ReactNode } from "react";

import {
  ArrowRightIcon,
  ChartBarIcon,
  ListChecksIcon,
  MountainsIcon,
  PresentationIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

import { MeasurableStatus, RockStatus } from "@repo/library";
import { Card, cn, Pill, StatTile } from "@repo/ui";

import { useIssues } from "@/hooks/use-issues";
import { useMeeting } from "@/hooks/use-meeting";
import { useRocks } from "@/hooks/use-rocks";
import { useScorecard } from "@/hooks/use-scorecard";
import { useTodos } from "@/hooks/use-todos";
import { meetingPath, sectionPath } from "@/lib/navigation";

interface TileProps {
  teamId: string;
  className?: string;
}

export function OpenLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {children}
      <ArrowRightIcon aria-hidden weight="bold" className="size-4" />
    </Link>
  );
}

export function MeetingTile({ teamId, className }: TileProps) {
  const { data } = useMeeting(teamId);
  const meeting = data?.meeting;
  const section = meeting?.agenda.find((item) => item.section === meeting.section);

  return (
    <Card
      className={cn(
        "flex flex-col gap-5 border-primary bg-primary p-7 text-primary-foreground",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-xl bg-white/15">
        <PresentationIcon aria-hidden weight="duotone" className="size-6" />
      </span>
      <div className="grid gap-2">
        <p className="text-[15px] font-semibold text-white/80">
          {meeting ? "Level 10 Meeting in progress" : "Level 10 Meeting"}
        </p>
        <p className="text-[32px] font-bold leading-tight">
          {meeting ? `Now: ${section?.label ?? "Scorecard"}` : "Not started"}
        </p>
        <p className="text-[15px] text-white/80">
          {meeting
            ? `Facilitated by ${meeting.facilitator.name}. Join to follow along live.`
            : "The weekly team meeting in three steps: Scorecard, Issues, wrap-up."}
        </p>
      </div>
      <Link
        href={meetingPath(teamId)}
        className="mt-auto inline-flex h-12 w-fit items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-primary transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        {meeting ? "Join meeting" : "Open meeting room"}
        <ArrowRightIcon aria-hidden weight="bold" className="size-4" />
      </Link>
    </Card>
  );
}

export function ScorecardTile({ teamId, className }: TileProps) {
  const { data: scorecard, isLoading } = useScorecard(teamId);
  const statuses =
    scorecard?.measurables.map(
      (measurable) =>
        measurable.cells.find((cell) => cell.weekStart === scorecard.lastClosedWeek)?.status,
    ) ?? [];
  const met = statuses.filter((status) => status === MeasurableStatus.ON_TRACK).length;

  return (
    <StatTile
      icon={ChartBarIcon}
      label="Scorecard"
      loading={isLoading}
      value={`${met} of ${statuses.length}`}
      hint="weekly goals met last week"
      className={className}
      footer={<OpenLink href={sectionPath(teamId, "scorecard")}>Open Scorecard</OpenLink>}
    />
  );
}

export function IssuesTile({ teamId, className }: TileProps) {
  const { data: issues, isLoading } = useIssues(teamId, "unsolved");
  const top = issues?.filter((issue) => issue.priority === 5).length ?? 0;

  return (
    <StatTile
      icon={WarningCircleIcon}
      label="Issues"
      loading={isLoading}
      value={issues?.length ?? 0}
      hint={top > 0 ? `open · ${top} marked highest priority` : "open"}
      className={className}
      footer={<OpenLink href={sectionPath(teamId, "issues")}>Open Issues</OpenLink>}
    />
  );
}

export function TodosTile({ teamId, className }: TileProps) {
  const { data, isLoading } = useTodos(teamId);
  const completion = data?.completion ?? null;
  const overdue = data?.todos.filter((todo) => todo.overdue).length ?? 0;

  return (
    <StatTile
      icon={ListChecksIcon}
      label="To-Dos"
      loading={isLoading}
      value={completion ? `${completion.ratePercent}%` : "–"}
      hint={`done last week · ${overdue === 0 ? "nothing" : overdue} overdue now`}
      badge={
        completion ? (
          <Pill tone={completion.meetsTarget ? "success" : "danger"}>
            {completion.meetsTarget ? "On target" : "Below target"}
          </Pill>
        ) : null
      }
      className={className}
      footer={<OpenLink href={sectionPath(teamId, "todos")}>Open To-Dos</OpenLink>}
    />
  );
}

export function RocksTile({ teamId, className }: TileProps) {
  const { data: rocks, isLoading } = useRocks(teamId);
  const offTrack = rocks?.filter((rock) => rock.status === RockStatus.OFF_TRACK).length ?? 0;
  const total = rocks?.length ?? 0;

  return (
    <StatTile
      icon={MountainsIcon}
      label="Rocks"
      loading={isLoading}
      value={`${total - offTrack} of ${total}`}
      hint="on track or complete this quarter"
      badge={offTrack > 0 ? <Pill tone="danger">{offTrack} off track</Pill> : null}
      className={className}
      footer={<OpenLink href={sectionPath(teamId, "rocks")}>Open Rocks</OpenLink>}
    />
  );
}
