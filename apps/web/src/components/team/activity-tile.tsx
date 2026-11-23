import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";

import { formatInstant } from "@repo/library";
import { ListSkeleton, SectionCard, UserAvatar } from "@repo/ui";

import { useActivity } from "@/hooks/use-activity";
import { useTeam } from "@/hooks/use-teams";

const SHOWN = 8;

export function ActivityTile({ teamId, className }: { teamId: string; className?: string }) {
  const { data: entries, isLoading, error } = useActivity(teamId);
  const { data: team } = useTeam(teamId);
  const timeZone = team?.timezone ?? "UTC";

  return (
    <SectionCard
      icon={ClockCounterClockwiseIcon}
      title="Recent activity"
      description="Who changed what, newest first."
      className={className}
    >
      {isLoading ? <ListSkeleton rows={4} avatar /> : null}
      {error ? <p className="text-destructive">{error.message}</p> : null}
      {entries && entries.length === 0 ? (
        <p className="text-muted-foreground">No changes yet.</p>
      ) : null}
      {entries && entries.length > 0 ? (
        <ul aria-label="Recent activity" className="-mt-2 divide-y divide-border">
          {entries.slice(0, SHOWN).map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 py-3">
              <UserAvatar name={entry.actor.name} className="size-8 shrink-0" />
              <div className="min-w-0">
                <p className="text-[15px] leading-snug">
                  <span className="font-semibold">{entry.actor.name}</span>{" "}
                  {entry.summary.charAt(0).toLowerCase() + entry.summary.slice(1)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatInstant(entry.at, timeZone)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </SectionCard>
  );
}
