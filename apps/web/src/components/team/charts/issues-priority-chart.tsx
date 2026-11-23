import { WarningCircleIcon } from "@phosphor-icons/react";

import { NO_PRIORITY, PRIORITY_OPTIONS } from "@repo/library";
import { ListSkeleton, SectionCard } from "@repo/ui";

import { OpenLink } from "@/components/team/team-overview";
import { useIssues } from "@/hooks/use-issues";
import { sectionPath } from "@/lib/navigation";

export function IssuesPriorityChart({ teamId, className }: { teamId: string; className?: string }) {
  const { data: issues, isLoading } = useIssues(teamId, "unsolved");

  const rows = PRIORITY_OPTIONS.map((option) => ({
    label: option.label,
    count:
      issues?.filter((issue) =>
        option.value === NO_PRIORITY
          ? issue.priority === null
          : issue.priority === Number(option.value),
      ).length ?? 0,
  }));
  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <SectionCard
      icon={WarningCircleIcon}
      title="Open Issues by priority"
      description={`${issues?.length ?? 0} unsolved. The meeting works them from the top.`}
      className={className}
    >
      {isLoading ? <ListSkeleton rows={4} trailing={false} /> : null}
      {issues ? (
        <>
          <ul aria-label="Open Issues by priority" className="grid gap-3.5">
            {rows.map((row) => (
              <li
                key={row.label}
                className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-sm"
              >
                <span className="truncate font-medium">{row.label}</span>
                <span className="h-2.5 rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${(row.count / max) * 100}%`, minWidth: row.count ? 10 : 0 }}
                  />
                </span>
                <span className="text-right font-bold tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex justify-end">
            <OpenLink href={sectionPath(teamId, "issues")}>Open Issues</OpenLink>
          </div>
        </>
      ) : null}
    </SectionCard>
  );
}
