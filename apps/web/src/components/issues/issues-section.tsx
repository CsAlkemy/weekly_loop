import { useState } from "react";

import { PlusIcon, WarningCircleIcon } from "@phosphor-icons/react";

import { canWrite, type Issue, type IssueStatus } from "@repo/library";
import { cn, CommonButton, ListSkeleton, SectionCard, toast } from "@repo/ui";

import { AddTodoModal } from "@/components/issues/add-todo-modal";
import { IssueCreateDrawer } from "@/components/issues/issue-create-drawer";
import {
  ALL_PRIORITIES,
  filterIssues,
  IssueListControls,
  sortIssues,
  type IssueSort,
} from "@/components/issues/issue-list-controls";
import { IssueRow } from "@/components/issues/issue-row";
import { SolveIssueModal } from "@/components/issues/solve-issue-modal";
import { SolvedIssueRow } from "@/components/issues/solved-issue-row";
import { useSession } from "@/hooks/use-auth";
import { useIssues, useSetIssuePriority } from "@/hooks/use-issues";

interface IssuesSectionProps {
  teamId: string;
  timeZone: string;
  title?: string;
}

const TABS: { status: IssueStatus; label: string }[] = [
  { status: "unsolved", label: "Unsolved" },
  { status: "solved", label: "Solved" },
];

export function IssuesSection({ teamId, timeZone, title = "Issues" }: IssuesSectionProps) {
  const { user } = useSession();
  const [status, setStatus] = useState<IssueStatus>("unsolved");
  const [solving, setSolving] = useState<Issue | null>(null);
  const [addingTodo, setAddingTodo] = useState<Issue | null>(null);
  const [adding, setAdding] = useState(false);
  const [priority, setPriorityFilter] = useState(ALL_PRIORITIES);
  const [sort, setSort] = useState<IssueSort>("order");

  const unsolved = useIssues(teamId, "unsolved");
  const solved = useIssues(teamId, "solved");
  const setPriority = useSetIssuePriority(teamId);

  const readOnly = !user || !canWrite(user.role);
  const current = status === "unsolved" ? unsolved : solved;
  const counts = { unsolved: unsolved.data?.length, solved: solved.data?.length };
  const ranks = new Map((unsolved.data ?? []).map((issue, index) => [issue.id, index + 1]));
  const visible = current.data
    ? status === "unsolved"
      ? sortIssues(filterIssues(current.data, priority), sort)
      : filterIssues(current.data, priority)
    : [];

  return (
    <SectionCard
      id="issues"
      icon={WarningCircleIcon}
      title={title}
      description="Highest priority first, then oldest. Solve each one with a short note."
      action={
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Issues"
            className="flex shrink-0 rounded-full bg-muted p-1"
          >
            {TABS.map((tab) => (
              <button
                key={tab.status}
                type="button"
                role="tab"
                aria-selected={status === tab.status}
                onClick={() => setStatus(tab.status)}
                className={cn(
                  "h-8 rounded-full px-3.5 text-sm font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  status === tab.status
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {counts[tab.status] === undefined ? "" : ` (${counts[tab.status]})`}
              </button>
            ))}
          </div>
          {current.data && current.data.length > 0 ? (
            <IssueListControls
              issues={current.data}
              priority={priority}
              sort={status === "unsolved" ? sort : null}
              onPriorityChange={setPriorityFilter}
              onSortChange={setSort}
            />
          ) : null}
          {readOnly ? null : (
            <CommonButton type="button" className="h-10" onClick={() => setAdding(true)}>
              <PlusIcon aria-hidden weight="bold" />
              Add Issue
            </CommonButton>
          )}
        </div>
      }
    >
      {current.isLoading ? <ListSkeleton rows={4} /> : null}
      {current.error ? <p className="text-destructive">{current.error.message}</p> : null}

      {current.data && current.data.length === 0 ? (
        <p className="py-4 text-muted-foreground">
          {status === "unsolved" ? "No unsolved Issues. Nice." : "No solved Issues yet."}
        </p>
      ) : null}

      {current.data && current.data.length > 0 && priority !== ALL_PRIORITIES ? (
        <p
          className="mb-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          aria-live="polite"
        >
          Showing {visible.length} of {current.data.length}
          <button
            type="button"
            onClick={() => setPriorityFilter(ALL_PRIORITIES)}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Clear filter
          </button>
        </p>
      ) : null}

      {current.data && current.data.length > 0 && visible.length === 0 ? (
        <div className="flex flex-wrap items-center gap-3 py-4">
          <p className="text-muted-foreground">No Issues have this priority.</p>
          <CommonButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPriorityFilter(ALL_PRIORITIES)}
          >
            Show all priorities
          </CommonButton>
        </div>
      ) : null}

      {status === "unsolved" && visible.length > 0 ? (
        <ol aria-label="Unsolved Issues" className="divide-y divide-border">
          {visible.map((issue) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              rank={ranks.get(issue.id) ?? 0}
              timeZone={timeZone}
              readOnly={readOnly}
              priorityPending={setPriority.isPending && setPriority.variables?.issueId === issue.id}
              onPriorityChange={(priority) =>
                setPriority.mutate(
                  { issueId: issue.id, priority, expected: issue.priority },
                  {
                    onError: (error) =>
                      toast.error(error.message || "Could not change the priority"),
                  },
                )
              }
              onAddTodo={() => setAddingTodo(issue)}
              onSolve={() => setSolving(issue)}
            />
          ))}
        </ol>
      ) : null}

      {status === "solved" && visible.length > 0 ? (
        <ul aria-label="Solved Issues" className="divide-y divide-border">
          {visible.map((issue) => (
            <SolvedIssueRow key={issue.id} issue={issue} timeZone={timeZone} />
          ))}
        </ul>
      ) : null}

      <SolveIssueModal teamId={teamId} issue={solving} onClose={() => setSolving(null)} />
      <AddTodoModal teamId={teamId} issue={addingTodo} onClose={() => setAddingTodo(null)} />
      <IssueCreateDrawer teamId={teamId} open={adding} onClose={() => setAdding(false)} />
    </SectionCard>
  );
}
