import Link from "next/link";

import { CheckCircleIcon, ListChecksIcon, StarIcon, UsersIcon } from "@phosphor-icons/react";

import { formatDate, formatInstant, formatScore, isApiError } from "@repo/library";
import {
  CardSkeleton,
  cn,
  CommonButton,
  PageHeaderSkeleton,
  Pill,
  SectionCard,
  StatTile,
} from "@repo/ui";

import { PAGE_CLASS, PageHeader } from "@/components/layout/page-header";
import { SCORE_STATUS } from "@/components/scorecard/score-status";
import { useMeetingSummary } from "@/hooks/use-meeting";
import { useTeam } from "@/hooks/use-teams";
import { meetingPath, teamPath } from "@/lib/navigation";

export function MeetingSummary({ teamId, meetingId }: { teamId: string; meetingId: string }) {
  const { data: team, error: teamError, isLoading: teamLoading } = useTeam(teamId);
  const { data: summary, isLoading, error } = useMeetingSummary(teamId, meetingId);

  if (teamLoading || isLoading) {
    return (
      <main className={PAGE_CLASS}>
        <PageHeaderSkeleton />
        <CardSkeleton />
      </main>
    );
  }

  if (teamError || error || !team || !summary) {
    const failure = teamError ?? error;

    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-bold">
          {isApiError(failure) && failure.status === 403
            ? "No access to this team"
            : "Summary not found"}
        </h1>
        <CommonButton asChild variant="outline">
          <Link href="/teams">Back to your teams</Link>
        </CommonButton>
      </main>
    );
  }

  return (
    <main className={PAGE_CLASS}>
      <section aria-label="Meeting summary" className="grid gap-6">
        <PageHeader
          title="Meeting summary"
          subtitle={
            <>
              {team.name} · {formatInstant(summary.startedAt, team.timezone)} to{" "}
              {formatInstant(summary.endedAt, team.timezone)} · facilitated by{" "}
              {summary.facilitator.name}
            </>
          }
        >
          <CommonButton asChild variant="outline">
            <Link href={meetingPath(teamId)}>Back to meeting</Link>
          </CommonButton>
          <CommonButton asChild>
            <Link href={teamPath(teamId)}>Back to team</Link>
          </CommonButton>
        </PageHeader>

        <div aria-label="Meeting totals" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            icon={StarIcon}
            value={summary.rating === null ? "–" : summary.rating.toFixed(1)}
            label="Meeting rating"
            hint={
              summary.ratingsCount === 0
                ? "No one rated"
                : `from ${summary.ratingsCount} rating${summary.ratingsCount === 1 ? "" : "s"}`
            }
          />
          <StatTile
            icon={CheckCircleIcon}
            value={summary.issuesSolved.length}
            label="Issues solved"
            hint="During the meeting"
          />
          <StatTile
            icon={ListChecksIcon}
            value={summary.todosCreated.length}
            label="To-Dos created"
            hint="During the meeting"
          />
          <StatTile
            icon={UsersIcon}
            value={summary.attendees.length}
            label="Attendees"
            hint="Joined the meeting"
          />
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <SectionCard
            title="Scorecard"
            description={`Week of ${formatDate(summary.scorecardWeek)}, the last closed week.`}
          >
            <ul aria-label="Measurable statuses" className="divide-y divide-border">
              {summary.measurables.map((measurable) => {
                const status = SCORE_STATUS[measurable.status];
                const Icon = status.icon;

                return (
                  <li key={measurable.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="truncate font-semibold">{measurable.name}</span>
                    <span className="flex shrink-0 items-center gap-3 tabular-nums">
                      {measurable.value === null
                        ? "No score"
                        : formatScore(measurable.value, measurable.unit)}
                      <span
                        className={cn("flex items-center gap-1 text-sm font-semibold", status.tone)}
                      >
                        <Icon aria-hidden className="size-3.5" />
                        {status.label}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </SectionCard>

          <SectionCard title="Attendees" description={`${summary.attendees.length} joined.`}>
            <ul aria-label="Attendees" className="flex flex-wrap gap-2">
              {summary.attendees.map((attendee) => (
                <li key={attendee.id}>
                  <Pill className="px-3 py-2 text-sm text-foreground">{attendee.name}</Pill>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            title="Issues solved"
            description={`${summary.issuesSolved.length} during the meeting.`}
          >
            {summary.issuesSolved.length === 0 ? (
              <p className="text-muted-foreground">No Issues were solved.</p>
            ) : (
              <ul aria-label="Issues solved" className="grid gap-3">
                {summary.issuesSolved.map((issue) => (
                  <li key={issue.id}>
                    <p className="font-semibold">{issue.title}</p>
                    {issue.resolutionNote ? (
                      <p className="mt-2 rounded-xl bg-muted px-4 py-3">{issue.resolutionNote}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="To-Dos created"
            description={`${summary.todosCreated.length} during the meeting.`}
          >
            {summary.todosCreated.length === 0 ? (
              <p className="text-muted-foreground">No To-Dos were created.</p>
            ) : (
              <ul aria-label="To-Dos created" className="divide-y divide-border">
                {summary.todosCreated.map((todo) => (
                  <li key={todo.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{todo.title}</p>
                      <p className="text-sm text-muted-foreground">{todo.owner.name}</p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-muted-foreground">
                      Due {formatDate(todo.dueDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </section>
    </main>
  );
}
