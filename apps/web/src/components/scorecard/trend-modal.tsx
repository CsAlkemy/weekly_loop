import { formatGoal, formatScore, MeasurableStatus, type Measurable } from "@repo/library";
import { CommonModal, Pill } from "@repo/ui";

import { SCORE_STATUS } from "@/components/scorecard/score-status";
import { StatusMarker, TrendChart } from "@/components/scorecard/trend-chart";

interface TrendModalProps {
  measurable: Measurable | null;
  weeks: string[];
  lastClosedWeek: string;
  onClose: () => void;
}

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-muted px-4 py-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 flex flex-wrap items-center gap-2 text-lg font-bold tabular-nums">
        {children}
      </dd>
    </div>
  );
}

export function TrendModal({ measurable, weeks, lastClosedWeek, onClose }: TrendModalProps) {
  const entered = measurable?.cells.filter((cell) => cell.value !== null) ?? [];
  const met = entered.filter((cell) => cell.status === MeasurableStatus.ON_TRACK).length;
  const average = entered.length
    ? entered.reduce((sum, cell) => sum + (cell.value ?? 0), 0) / entered.length
    : null;
  const last = measurable?.cells.find((cell) => cell.weekStart === lastClosedWeek);

  return (
    <CommonModal
      open={measurable !== null}
      onOpenChange={(next) => (next ? undefined : onClose())}
      title={measurable ? `${measurable.name} · trend` : "Trend"}
      description={
        measurable
          ? `Last ${weeks.length} weeks, oldest on the left. Gaps are weeks with no number. Goal: ${formatGoal(measurable.goal, measurable.unit).toLowerCase()}. Owner: ${measurable.owner.name}.`
          : undefined
      }
      className="sm:max-w-3xl"
    >
      {measurable ? (
        <>
          <dl className="grid gap-3 sm:grid-cols-3">
            <Figure label="Weeks on goal">
              {met} of {entered.length}
            </Figure>
            <Figure label="Average">
              {average === null
                ? "–"
                : formatScore(Math.round(average * 100) / 100, measurable.unit)}
            </Figure>
            <Figure label="Last week">
              {last?.value === null || last === undefined
                ? "–"
                : formatScore(last.value, measurable.unit)}
              {last ? (
                <Pill tone={SCORE_STATUS[last.status].pill}>
                  {SCORE_STATUS[last.status].meaning}
                </Pill>
              ) : null}
            </Figure>
          </dl>
          <TrendChart measurable={measurable} weeks={weeks} />
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-5 rounded bg-primary" />
              Weekly number
            </li>
            <li className="flex items-center gap-2">
              <svg aria-hidden viewBox="0 0 16 16" className="size-4">
                <StatusMarker status={MeasurableStatus.ON_TRACK} x={8} y={8} />
              </svg>
              On track · goal met
            </li>
            <li className="flex items-center gap-2">
              <svg aria-hidden viewBox="0 0 16 16" className="size-4">
                <StatusMarker status={MeasurableStatus.OFF_TRACK} x={8} y={8} />
              </svg>
              Off track · goal missed
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-5 rounded bg-ink" />
              Goal
            </li>
          </ul>
        </>
      ) : null}
    </CommonModal>
  );
}
