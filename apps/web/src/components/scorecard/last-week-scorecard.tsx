import { CalendarCheckIcon } from "@phosphor-icons/react";

import { formatDate, formatGoal, formatScore, MeasurableStatus } from "@repo/library";
import { cn, ListSkeleton, Pill, SectionCard } from "@repo/ui";

import { SCORE_STATUS } from "@/components/scorecard/score-status";
import { useScorecard } from "@/hooks/use-scorecard";

export function LastWeekScorecard({ teamId, className }: { teamId: string; className?: string }) {
  const { data: scorecard, isLoading } = useScorecard(teamId);
  const week = scorecard?.lastClosedWeek;

  const rows =
    scorecard?.measurables.map((measurable) => {
      const cell = measurable.cells.find((item) => item.weekStart === week);
      return { measurable, value: cell?.value ?? null, status: cell?.status };
    }) ?? [];
  const met = rows.filter((row) => row.status === MeasurableStatus.ON_TRACK).length;

  return (
    <SectionCard
      icon={CalendarCheckIcon}
      title="Last week's numbers"
      description={
        week
          ? `Week of ${formatDate(week)}. Did each number reach its goal?`
          : "Did each number reach its goal?"
      }
      action={
        scorecard ? (
          <Pill tone={met === rows.length ? "success" : "warning"} className="px-3 py-1.5 text-sm">
            {met} of {rows.length} goals met
          </Pill>
        ) : null
      }
      className={className}
    >
      {isLoading ? <ListSkeleton rows={3} /> : null}
      <ul aria-label="Last week's numbers" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ measurable, value, status }) => {
          const look = status ? SCORE_STATUS[status] : null;

          return (
            <li
              key={measurable.id}
              className={cn(
                "flex flex-col gap-3 rounded-xl border p-4",
                status === MeasurableStatus.OFF_TRACK
                  ? "border-destructive/25 bg-destructive-soft/40"
                  : "border-border",
              )}
            >
              <p className="font-semibold leading-snug">{measurable.name}</p>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[28px] font-bold leading-none tracking-tight tabular-nums">
                  {value === null ? "–" : formatScore(value, measurable.unit)}
                </span>
                {look ? <Pill tone={look.pill}>{look.meaning}</Pill> : null}
              </div>
              <p className="text-sm text-muted-foreground">
                Goal: {formatGoal(measurable.goal, measurable.unit).toLowerCase()} ·{" "}
                {measurable.owner.name}
              </p>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
