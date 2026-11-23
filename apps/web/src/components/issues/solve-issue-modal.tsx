import { solveIssueSchema, type Issue } from "@repo/library";
import {
  CommonButton,
  CommonForm,
  CommonFormSubmit,
  CommonModal,
  CommonTextarea,
  toast,
} from "@repo/ui";

import { useSolveIssue } from "@/hooks/use-issues";

interface SolveIssueModalProps {
  teamId: string;
  issue: Issue | null;
  onClose: () => void;
}

export function SolveIssueModal({ teamId, issue, onClose }: SolveIssueModalProps) {
  const solveIssue = useSolveIssue(teamId);

  return (
    <CommonModal
      open={issue !== null}
      onOpenChange={(open) => (open ? undefined : onClose())}
      title="Solve Issue"
      description={issue?.title}
    >
      {issue ? (
        <CommonForm
          schema={solveIssueSchema}
          defaultValues={{ note: "" }}
          onSubmit={({ note }) =>
            solveIssue.mutate(
              { issueId: issue.id, note },
              {
                onSuccess: () => {
                  toast.success("Issue solved");
                  onClose();
                },
                onError: (error) => toast.error(error.message || "Could not solve the Issue"),
              },
            )
          }
        >
          {issue.details ? (
            <p className="max-h-40 overflow-y-auto whitespace-pre-line rounded-xl bg-muted px-4 py-3 text-sm">
              {issue.details}
            </p>
          ) : null}
          <CommonTextarea
            name="note"
            label="How was it resolved?"
            placeholder="The decision, in a sentence or two"
            rows={4}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <CommonButton type="button" variant="ghost" onClick={onClose}>
              Cancel
            </CommonButton>
            <CommonFormSubmit loading={solveIssue.isPending}>Solve Issue</CommonFormSubmit>
          </div>
        </CommonForm>
      ) : null}
    </CommonModal>
  );
}
