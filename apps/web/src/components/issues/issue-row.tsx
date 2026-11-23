import { CheckIcon, ListPlusIcon } from "@phosphor-icons/react";

import { formatDate, formatInstant, type Issue } from "@repo/library";
import { CommonButton, Pill } from "@repo/ui";

import { PrioritySelect } from "@/components/issues/priority-select";

interface IssueRowProps {
  issue: Issue;
  rank: number;
  timeZone: string;
  readOnly: boolean;
  priorityPending: boolean;
  onPriorityChange: (priority: number | null) => void;
  onAddTodo: () => void;
  onSolve: () => void;
}

export function IssueSourceChip({ issue }: { issue: Issue }) {
  if (!issue.source) return null;

  return (
    <Pill tone="primary" className="whitespace-normal leading-snug">
      From scorecard: {issue.source.measurableName}, week of {formatDate(issue.source.weekStart)}
    </Pill>
  );
}

export function IssueRow({
  issue,
  rank,
  timeZone,
  readOnly,
  priorityPending,
  onPriorityChange,
  onAddTodo,
  onSolve,
}: IssueRowProps) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4">
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold tabular-nums text-primary"
      >
        {rank}
      </span>
      <div className="min-w-0 flex-1 basis-60">
        <p className="font-semibold leading-snug">{issue.title}</p>
        {issue.details ? (
          <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-foreground/80">
            {issue.details}
          </p>
        ) : null}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-muted-foreground">
          <span>
            {issue.owner.name} · Created {formatInstant(issue.createdAt, timeZone)}
          </span>
          <IssueSourceChip issue={issue} />
        </p>
      </div>

      {readOnly ? (
        <Pill className="text-sm">
          {issue.priority === null ? "No priority" : `Priority ${issue.priority}`}
        </Pill>
      ) : (
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <PrioritySelect
            issueTitle={issue.title}
            priority={issue.priority}
            disabled={priorityPending}
            onChange={onPriorityChange}
          />
          <CommonButton
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddTodo}
            aria-label={`Add a To-Do for "${issue.title}"`}
          >
            <ListPlusIcon aria-hidden />
            Add To-Do
          </CommonButton>
          <CommonButton
            type="button"
            variant="dark"
            size="sm"
            onClick={onSolve}
            aria-label={`Solve "${issue.title}"`}
          >
            <CheckIcon aria-hidden weight="bold" />
            Solve
          </CommonButton>
        </div>
      )}
    </li>
  );
}
