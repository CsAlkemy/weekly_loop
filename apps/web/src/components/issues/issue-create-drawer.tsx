import { createIssueSchema, NO_PRIORITY, PRIORITY_OPTIONS } from "@repo/library";
import {
  CommonButton,
  CommonDrawer,
  CommonForm,
  CommonFormSubmit,
  CommonInput,
  CommonSelect,
  CommonTextarea,
  toast,
} from "@repo/ui";

import { useCreateIssue } from "@/hooks/use-issues";

const NEXT_STEPS = [
  "It joins the list in priority order, with you as its owner.",
  "In the Level 10 Meeting the team works the list from the top: identify, discuss, solve.",
  "Solve it with a short note, and add To-Dos for whatever needs doing.",
];

interface IssueCreateDrawerProps {
  teamId: string;
  open: boolean;
  onClose: () => void;
}

export function IssueCreateDrawer({ teamId, open, onClose }: IssueCreateDrawerProps) {
  const createIssue = useCreateIssue(teamId);

  return (
    <CommonDrawer
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
      title="Add an Issue"
      description="A problem, idea or blocker the team should talk through."
    >
      {open ? (
        <CommonForm
          schema={createIssueSchema}
          defaultValues={{ title: "", details: "", priority: NO_PRIORITY }}
          onSubmit={(values) =>
            createIssue.mutate(values, {
              onSuccess: (issue) => {
                toast.success(`Issue added: ${issue.title}`);
                onClose();
              },
              onError: (error) => toast.error(error.message || "Could not add the Issue"),
            })
          }
          aria-label="Add an Issue"
          className="flex flex-1 flex-col gap-5"
        >
          <CommonInput
            name="title"
            label="What needs solving?"
            placeholder="For example: Slow invoicing"
            autoComplete="off"
            autoFocus
          />
          <CommonTextarea
            name="details"
            label="Details (optional)"
            placeholder="What is happening, why it matters, any numbers or links"
            rows={5}
          />
          <div className="grid gap-2">
            <CommonSelect name="priority" label="Priority" options={PRIORITY_OPTIONS} />
            <p className="text-sm text-muted-foreground">
              5 is the most urgent. You can change it later from the list.
            </p>
          </div>

          <div className="rounded-2xl bg-muted p-5">
            <p className="text-sm font-semibold">What happens next</p>
            <ol className="mt-3 grid gap-2.5 text-sm text-muted-foreground">
              {NEXT_STEPS.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-auto flex justify-end gap-2 border-t border-border pt-5">
            <CommonButton type="button" variant="ghost" onClick={onClose}>
              Cancel
            </CommonButton>
            <CommonFormSubmit loading={createIssue.isPending}>Add Issue</CommonFormSubmit>
          </div>
        </CommonForm>
      ) : null}
    </CommonDrawer>
  );
}
