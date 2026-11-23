import { ChartPieSliceIcon } from "@phosphor-icons/react";

import { formatDate, type TodoWeek } from "@repo/library";
import { Pill, ProgressBar, SectionCard, StatSkeleton } from "@repo/ui";

import { useTodos } from "@/hooks/use-todos";

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted px-3 py-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function ThisWeek({ week }: { week: TodoWeek }) {
  const { completion } = week;

  return (
    <section
      aria-label="This week so far"
      className="mt-5 rounded-2xl border border-border px-4 py-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-semibold">This week so far</h3>
        <span className="text-sm text-muted-foreground">Week of {formatDate(week.weekStart)}</span>
      </div>
      {completion ? (
        <>
          <p className="mt-2 text-[15px] font-medium tabular-nums">
            {completion.done} of {completion.due} done · {completion.ratePercent}%
          </p>
          <ProgressBar
            value={completion.ratePercent}
            target={90}
            label={`${completion.ratePercent}% of this week's To-Dos done so far`}
            className="mt-3"
          />
        </>
      ) : (
        <p className="mt-2 text-[15px] text-muted-foreground">Nothing is due this week.</p>
      )}
      <p className="mt-3 text-sm text-muted-foreground">
        Moves as To-Dos are ticked. It becomes the score above once the week closes.
      </p>
    </section>
  );
}

export function TodoCompletion({ teamId, className }: { teamId: string; className?: string }) {
  const { data, isLoading } = useTodos(teamId);
  const completion = data?.completion ?? null;
  const overdue = data?.todos.filter((todo) => todo.overdue).length ?? 0;

  return (
    <SectionCard
      id="todo-completion"
      icon={ChartPieSliceIcon}
      title="To-Do completion"
      description={
        data
          ? `Week of ${formatDate(data.lastClosedWeek)}, the last closed week.`
          : "The last closed week."
      }
      className={className}
    >
      {isLoading ? <StatSkeleton /> : null}

      {data && completion ? (
        <>
          <p className="flex flex-wrap items-center gap-3">
            <span className="text-5xl font-bold leading-none tracking-tight tabular-nums">
              {completion.ratePercent}%
            </span>
            <Pill tone={completion.meetsTarget ? "success" : "danger"} className="text-sm">
              {completion.meetsTarget ? "On target" : "Below target"}
            </Pill>
          </p>
          <ProgressBar
            value={completion.ratePercent}
            target={90}
            tone={completion.meetsTarget ? "success" : "danger"}
            label={`${completion.ratePercent}% of To-Dos done, target 90%`}
            className="mt-6"
          />
          <p className="mt-4 text-[15px] font-medium">
            {completion.done} of {completion.due} done ·{" "}
            {completion.meetsTarget ? "meets 90% target" : "below 90% target"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            The share of To-Dos due that week that were finished on time. The line marks the 90%
            goal.
          </p>
          <dl className="mt-5 grid grid-cols-3 gap-2">
            <Figure label="Done" value={completion.done} />
            <Figure label="Due" value={completion.due} />
            <Figure label="Overdue now" value={overdue} />
          </dl>
        </>
      ) : null}

      {data && !completion ? (
        <p className="text-muted-foreground">Nothing was due that week.</p>
      ) : null}

      {data ? <ThisWeek week={data.thisWeek} /> : null}
    </SectionCard>
  );
}
