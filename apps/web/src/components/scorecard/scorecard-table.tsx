import { ChartLineUpIcon } from "@phosphor-icons/react";

import { formatGoal, formatWeekRange, type Measurable, type Scorecard } from "@repo/library";
import { cn } from "@repo/ui";

import { OwnerAvatar } from "@/components/scorecard/owner-avatar";
import { ScoreCell } from "@/components/scorecard/score-cell";
import type { MakeIssueInput, SetScoreInput } from "@/hooks/use-scorecard";

interface ScorecardTableProps {
  scorecard: Scorecard;
  editable: boolean;
  saving: SetScoreInput | null;
  makingIssue: MakeIssueInput | null;
  onSave: (input: SetScoreInput) => void;
  onMakeIssue: (input: MakeIssueInput, alreadyOpen: boolean) => void;
  onShowTrend: (measurable: Measurable) => void;
}

const CELL = "border-b border-border px-2 py-3 align-middle";
const STICKY = "bg-card group-hover:bg-secondary md:sticky md:z-10";
const HEAD =
  "border-b border-border px-2 pb-3 pt-1 align-bottom text-xs font-semibold text-muted-foreground";
const COLUMNS = {
  owner: "w-24 min-w-24 md:left-0",
  title: "w-60 min-w-60 md:left-24",
  trend: "w-16 min-w-16 md:left-[21rem]",
  goal: "w-44 min-w-44 md:left-[25rem] md:shadow-[inset_-1px_0_0_var(--border)]",
};

export function ScorecardTable({
  scorecard,
  editable,
  saving,
  makingIssue,
  onSave,
  onMakeIssue,
  onShowTrend,
}: ScorecardTableProps) {
  const weeks = [...scorecard.weeks].reverse();

  return (
    <div className="-mx-6 overflow-x-auto">
      <table className="w-max min-w-full border-separate border-spacing-0 text-[15px]">
        <thead>
          <tr>
            <th scope="col" className={cn(HEAD, STICKY, COLUMNS.owner, "pl-6 text-left")}>
              Owner
            </th>
            <th scope="col" className={cn(HEAD, STICKY, COLUMNS.title, "text-left")}>
              Measurable
            </th>
            <th scope="col" className={cn(HEAD, STICKY, COLUMNS.trend, "text-center")}>
              Trend
            </th>
            <th scope="col" className={cn(HEAD, STICKY, COLUMNS.goal, "pr-4 text-left")}>
              Weekly goal
            </th>
            {weeks.map((week) => {
              const current = week === scorecard.currentWeek;
              const lastWeek = week === scorecard.lastClosedWeek;

              return (
                <th key={week} scope="col" className={cn(HEAD, "min-w-[116px] text-center")}>
                  <span
                    className={cn(
                      "mx-auto mb-1.5 flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      current && "text-foreground",
                      lastWeek && "bg-primary text-primary-foreground",
                      !current && !lastWeek && "invisible",
                    )}
                  >
                    {current ? (
                      <span aria-hidden className="size-2 rounded-full bg-primary" />
                    ) : null}
                    {current ? "This week" : lastWeek ? "Last week" : "–"}
                  </span>
                  <span
                    className={cn(
                      "whitespace-nowrap text-[13px] font-semibold",
                      lastWeek
                        ? "text-primary"
                        : current
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {formatWeekRange(week)}
                  </span>
                </th>
              );
            })}
            <th aria-hidden className={cn(HEAD, "w-4 min-w-4")} />
          </tr>
        </thead>
        <tbody>
          {scorecard.measurables.map((measurable) => {
            const cells = new Map(measurable.cells.map((cell) => [cell.weekStart, cell]));

            return (
              <tr key={measurable.id} className="group">
                <td className={cn(CELL, STICKY, COLUMNS.owner, "pl-6")}>
                  <OwnerAvatar owner={measurable.owner} />
                </td>
                <th
                  scope="row"
                  className={cn(CELL, STICKY, COLUMNS.title, "text-left font-semibold")}
                >
                  <span className="line-clamp-2 leading-snug">{measurable.name}</span>
                </th>
                <td className={cn(CELL, STICKY, COLUMNS.trend, "text-center")}>
                  <button
                    type="button"
                    onClick={() => onShowTrend(measurable)}
                    aria-label={`Show trend for ${measurable.name}`}
                    title="Show trend"
                    className="inline-flex size-9 items-center justify-center rounded-full border border-input bg-card text-primary transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <ChartLineUpIcon aria-hidden weight="bold" className="size-4" />
                  </button>
                </td>
                <td className={cn(CELL, STICKY, COLUMNS.goal, "pr-4 text-sm font-medium")}>
                  {formatGoal(measurable.goal, measurable.unit)}
                </td>
                {weeks.map((week) => {
                  const cell = cells.get(week);
                  if (!cell) return <td key={week} className={CELL} />;

                  const isSaving =
                    saving?.measurableId === measurable.id && saving.weekStart === week;

                  return (
                    <td key={week} className={cn(CELL, "group-hover:bg-secondary/60")}>
                      <ScoreCell
                        cell={isSaving ? { ...cell, value: saving.value } : cell}
                        unit={measurable.unit}
                        measurableName={measurable.name}
                        editable={editable}
                        highlight={week === scorecard.lastClosedWeek}
                        saving={isSaving}
                        makingIssue={
                          makingIssue?.measurableId === measurable.id &&
                          makingIssue.weekStart === week
                        }
                        onSave={(value) =>
                          onSave({ measurableId: measurable.id, weekStart: week, value })
                        }
                        onMakeIssue={() =>
                          onMakeIssue(
                            { measurableId: measurable.id, weekStart: week },
                            cell.issueId !== null,
                          )
                        }
                      />
                    </td>
                  );
                })}
                <td aria-hidden className={CELL} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
