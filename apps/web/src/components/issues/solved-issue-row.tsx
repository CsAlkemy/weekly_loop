import { CheckCircleIcon } from "@phosphor-icons/react";

import { formatInstant, type Issue } from "@repo/library";

import { IssueSourceChip } from "@/components/issues/issue-row";

export function SolvedIssueRow({ issue, timeZone }: { issue: Issue; timeZone: string }) {
  return (
    <li className="flex gap-4 py-4">
      <CheckCircleIcon aria-hidden weight="fill" className="mt-0.5 size-6 shrink-0 text-success" />
      <div className="grid min-w-0 flex-1 gap-2">
        <p className="font-semibold">{issue.title}</p>
        {issue.details ? (
          <p className="whitespace-pre-line text-sm text-foreground/80">{issue.details}</p>
        ) : null}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-muted-foreground">
          <span>
            {issue.owner.name}
            {issue.solvedAt ? ` · Solved ${formatInstant(issue.solvedAt, timeZone)}` : ""}
            {issue.solvedBy ? ` by ${issue.solvedBy.name}` : ""}
          </span>
          <IssueSourceChip issue={issue} />
        </p>
        {issue.resolutionNote ? (
          <p className="rounded-xl bg-muted px-4 py-3 text-[15px]">{issue.resolutionNote}</p>
        ) : null}
      </div>
    </li>
  );
}
