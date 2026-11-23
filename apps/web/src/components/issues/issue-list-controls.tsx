import { FunnelSimpleIcon, SortAscendingIcon } from "@phosphor-icons/react";

import { NO_PRIORITY, PRIORITY_OPTIONS, type Issue } from "@repo/library";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@repo/ui";

export const ALL_PRIORITIES = "all";

export const SORTS = {
  order: "Meeting order (highest first)",
  lowest: "Lowest priority first",
  newest: "Newest first",
  oldest: "Oldest first",
} as const;

export type IssueSort = keyof typeof SORTS;

export function filterIssues(issues: Issue[], priority: string): Issue[] {
  if (priority === ALL_PRIORITIES) return issues;
  return issues.filter((issue) =>
    priority === NO_PRIORITY ? issue.priority === null : issue.priority === Number(priority),
  );
}

export function sortIssues(issues: Issue[], sort: IssueSort): Issue[] {
  if (sort === "order") return issues;
  const created = (issue: Issue) => Date.parse(issue.createdAt);
  const rank = (issue: Issue) => issue.priority ?? 0;
  return [...issues].sort((a, b) => {
    if (sort === "newest") return created(b) - created(a);
    if (sort === "oldest") return created(a) - created(b);
    return rank(a) - rank(b) || created(a) - created(b);
  });
}

const SORT_SHORT: Record<IssueSort, string> = {
  order: "Meeting order",
  lowest: "Lowest first",
  newest: "Newest",
  oldest: "Oldest",
};

const TRIGGER =
  "h-10 w-auto shrink-0 gap-2 rounded-full px-3.5 text-sm font-semibold data-[active=true]:border-primary data-[active=true]:bg-accent data-[active=true]:text-primary";

interface IssueListControlsProps {
  issues: Issue[];
  priority: string;
  sort: IssueSort | null;
  onPriorityChange: (priority: string) => void;
  onSortChange: (sort: IssueSort) => void;
}

export function IssueListControls({
  issues,
  priority,
  sort,
  onPriorityChange,
  onSortChange,
}: IssueListControlsProps) {
  const count = (value: string) => filterIssues(issues, value).length;
  const filtered = priority !== ALL_PRIORITIES;
  const priorityLabel = filtered
    ? (PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? "Priority")
    : "Priority";

  return (
    <>
      <Select value={priority} onValueChange={onPriorityChange}>
        <SelectTrigger aria-label="Filter by priority" data-active={filtered} className={TRIGGER}>
          <div className="flex items-center gap-2">
            <FunnelSimpleIcon aria-hidden className="size-4 shrink-0" />
            <span className="hidden sm:inline">{priorityLabel}</span>
          </div>
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value={ALL_PRIORITIES}>All priorities ({issues.length})</SelectItem>
          {PRIORITY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label} ({count(option.value)})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {sort ? (
        <Select value={sort} onValueChange={(value) => onSortChange(value as IssueSort)}>
          <SelectTrigger aria-label="Sort by" data-active={sort !== "order"} className={TRIGGER}>
            <div className="flex items-center gap-2">
              <SortAscendingIcon aria-hidden className="size-4 shrink-0" />
              <span className="hidden sm:inline">{SORT_SHORT[sort]}</span>
            </div>
          </SelectTrigger>
          <SelectContent align="end">
            {Object.entries(SORTS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </>
  );
}
