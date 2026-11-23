import { MountainsIcon } from "@phosphor-icons/react";

import { RockStatus } from "@repo/library";
import { cn, ListSkeleton, SectionCard } from "@repo/ui";

import { OpenLink } from "@/components/team/team-overview";
import { useRocks } from "@/hooks/use-rocks";
import { sectionPath } from "@/lib/navigation";

const STATUS = {
  [RockStatus.ON_TRACK]: { label: "On track", bar: "bg-primary", dot: "bg-success" },
  [RockStatus.OFF_TRACK]: { label: "Off track", bar: "bg-destructive", dot: "bg-destructive" },
  [RockStatus.COMPLETE]: { label: "Complete", bar: "bg-primary", dot: "bg-primary" },
};

export function RocksChart({ teamId, className }: { teamId: string; className?: string }) {
  const { data: rocks, isLoading } = useRocks(teamId);

  return (
    <SectionCard
      icon={MountainsIcon}
      title="Rocks progress"
      description="How far each quarterly goal has come, by milestones done."
      className={className}
    >
      {isLoading ? <ListSkeleton rows={4} trailing={false} /> : null}
      {rocks && rocks.length === 0 ? (
        <p className="text-muted-foreground">No Rocks this quarter.</p>
      ) : null}
      {rocks && rocks.length > 0 ? (
        <>
          <ul aria-label="Rocks progress" className="grid gap-4">
            {rocks.map((rock) => {
              const look = STATUS[rock.status];
              return (
                <li key={rock.id} className="grid gap-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-semibold">{rock.title}</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <span aria-hidden className={cn("size-2 rounded-full", look.dot)} />
                      {look.label}
                    </span>
                    <span className="w-10 shrink-0 text-right font-bold tabular-nums">
                      {rock.progressPercent}%
                    </span>
                  </div>
                  <span
                    role="progressbar"
                    aria-label={`${rock.title} progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={rock.progressPercent}
                    className="h-2.5 rounded-full bg-muted"
                  >
                    <span
                      className={cn("block h-full rounded-full", look.bar)}
                      style={{ width: `${rock.progressPercent}%` }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 flex justify-end">
            <OpenLink href={sectionPath(teamId, "rocks")}>Open Rocks</OpenLink>
          </div>
        </>
      ) : null}
    </SectionCard>
  );
}
