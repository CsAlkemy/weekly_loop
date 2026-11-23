import Link from "next/link";

import { ArrowRightIcon, ClockCounterClockwiseIcon } from "@phosphor-icons/react";

import { formatInstant } from "@repo/library";
import { ListSkeleton, SectionCard, UserAvatar } from "@repo/ui";

import { usePastMeetings } from "@/hooks/use-meeting";
import { meetingSummaryPath } from "@/lib/navigation";

function minutesBetween(start: string, end: string): number {
  return Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 60000));
}

export function PastMeetings({ teamId, timeZone }: { teamId: string; timeZone: string }) {
  const { data: meetings, isLoading, error } = usePastMeetings(teamId);

  return (
    <SectionCard
      icon={ClockCounterClockwiseIcon}
      title="Past meetings"
      description="Every ended meeting, newest first. Each summary was saved when the meeting ended."
    >
      {isLoading ? <ListSkeleton rows={3} avatar /> : null}
      {error ? <p className="text-destructive">{error.message}</p> : null}
      {meetings && meetings.length === 0 ? (
        <p className="text-muted-foreground">No meetings yet.</p>
      ) : null}
      {meetings && meetings.length > 0 ? (
        <ul aria-label="Past meetings" className="-mt-2 divide-y divide-border">
          {meetings.map((meeting) => (
            <li key={meeting.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
              <UserAvatar name={meeting.facilitator.name} className="size-9 shrink-0" />
              <div className="min-w-0 flex-1 basis-56">
                <p className="font-semibold">{formatInstant(meeting.startedAt, timeZone)}</p>
                <p className="text-sm text-muted-foreground">
                  {meeting.facilitator.name} facilitated ·{" "}
                  {minutesBetween(meeting.startedAt, meeting.endedAt)} min ·{" "}
                  {meeting.attendeesCount} attended
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {meeting.rating === null
                  ? "Not rated"
                  : `Rated ${meeting.rating} (${meeting.ratingsCount})`}
              </p>
              <Link
                href={meetingSummaryPath(teamId, meeting.id)}
                aria-label={`Open the summary of the meeting on ${formatInstant(meeting.startedAt, timeZone)}`}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                Summary
                <ArrowRightIcon aria-hidden weight="bold" className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </SectionCard>
  );
}
