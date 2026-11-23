import { useState } from "react";

import { ChartBarIcon, FlagIcon, PlusIcon } from "@phosphor-icons/react";

import { canWrite, MeasurableStatus, type Measurable } from "@repo/library";
import { cn, CommonButton, SectionCard, TableSkeleton, toast, TooltipProvider } from "@repo/ui";

import { SCORE_STATUS } from "@/components/scorecard/score-status";
import { NewMeasurableModal } from "@/components/scorecard/new-measurable-modal";
import { ScorecardTable } from "@/components/scorecard/scorecard-table";
import { TrendModal } from "@/components/scorecard/trend-modal";
import { useSession } from "@/hooks/use-auth";
import { useTestForms } from "@/hooks/use-settings";
import {
  useMakeIssue,
  useScorecard,
  useSetScore,
  type MakeIssueInput,
  type SetScoreInput,
} from "@/hooks/use-scorecard";

const LEGEND = [MeasurableStatus.ON_TRACK, MeasurableStatus.OFF_TRACK, MeasurableStatus.PENDING];

function Legend({ editable }: { editable: boolean }) {
  return (
    <div className="mb-5 grid gap-3 rounded-2xl bg-muted px-5 py-4 text-sm lg:flex lg:flex-wrap lg:items-center lg:gap-x-7">
      <p className="font-semibold">How to read it</p>
      <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {LEGEND.map((status) => {
          const { label, meaning, swatch } = SCORE_STATUS[status];
          return (
            <li key={status} className="flex items-center gap-2">
              <span aria-hidden className={cn("size-4 rounded-md", swatch)} />
              <span>
                <span className="font-semibold">{label}</span>
                <span className="text-muted-foreground"> · {meaning}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="flex flex-wrap items-center gap-1.5 text-muted-foreground lg:ml-auto">
        {editable ? (
          <>
            Click a week to type its number. Click
            <FlagIcon aria-label="the flag" className="size-4 text-destructive" />
            to add a missed week to Issues.{" "}
          </>
        ) : null}
      </p>
    </div>
  );
}

interface ScorecardSectionProps {
  teamId: string;
  title?: string;
  description?: string;
}

export function ScorecardSection({
  teamId,
  title = "Scorecard · last 13 weeks",
  description = "The numbers your team checks every week. Each row is one number, each column is a week, newest on the left.",
}: ScorecardSectionProps) {
  const { user } = useSession();
  const { data: scorecard, isLoading, error } = useScorecard(teamId);
  const setScore = useSetScore(teamId);
  const editable = Boolean(user && canWrite(user.role));
  const testForms = useTestForms();
  const makeIssue = useMakeIssue(teamId);
  const [trend, setTrend] = useState<Measurable | null>(null);
  const [adding, setAdding] = useState(false);
  const trendMeasurable =
    trend && scorecard
      ? (scorecard.measurables.find((item) => item.id === trend.id) ?? null)
      : null;

  const save = (input: SetScoreInput) =>
    setScore.mutate(input, {
      onError: (saveError) => toast.error(saveError.message || "Could not save the score"),
    });

  const makeItAnIssue = (input: MakeIssueInput, alreadyOpen: boolean) =>
    makeIssue.mutate(input, {
      onSuccess: (issue) =>
        alreadyOpen
          ? toast.info(`Already on the Issues list: ${issue.title}`)
          : toast.success(`Added to Issues: ${issue.title}`),
      onError: (issueError) => toast.error(issueError.message || "Could not make it an Issue"),
    });

  return (
    <SectionCard
      id="scorecard"
      icon={ChartBarIcon}
      title={title}
      description={description}
      action={
        editable && testForms ? (
          <CommonButton type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
            <PlusIcon aria-hidden weight="bold" />
            New measurable
          </CommonButton>
        ) : null
      }
    >
      <Legend editable={editable} />
      {isLoading ? <TableSkeleton rows={5} columns={8} /> : null}
      {error ? <p className="text-destructive">{error.message}</p> : null}
      {scorecard && scorecard.measurables.length === 0 ? (
        <p className="text-muted-foreground">This team has no Measurables.</p>
      ) : null}
      {scorecard && scorecard.measurables.length > 0 ? (
        <TooltipProvider delayDuration={150}>
          <ScorecardTable
            scorecard={scorecard}
            editable={editable}
            saving={setScore.isPending ? (setScore.variables ?? null) : null}
            makingIssue={makeIssue.isPending ? (makeIssue.variables ?? null) : null}
            onSave={save}
            onMakeIssue={makeItAnIssue}
            onShowTrend={setTrend}
          />
        </TooltipProvider>
      ) : null}
      <NewMeasurableModal teamId={teamId} open={adding} onClose={() => setAdding(false)} />
      {scorecard ? (
        <TrendModal
          measurable={trendMeasurable}
          weeks={scorecard.weeks}
          lastClosedWeek={scorecard.lastClosedWeek}
          onClose={() => setTrend(null)}
        />
      ) : null}
    </SectionCard>
  );
}
