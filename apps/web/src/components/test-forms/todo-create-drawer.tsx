import { canWrite, createTodoSchema } from "@repo/library";
import {
  CommonButton,
  CommonDrawer,
  CommonForm,
  CommonFormSubmit,
  CommonInput,
  CommonSelect,
  toast,
} from "@repo/ui";

import { useSession } from "@/hooks/use-auth";
import { useTeam } from "@/hooks/use-teams";
import { useCreateTodo } from "@/hooks/use-todos";

interface TodoCreateDrawerProps {
  teamId: string;
  open: boolean;
  onClose: () => void;
}

export function TodoCreateDrawer({ teamId, open, onClose }: TodoCreateDrawerProps) {
  const { user } = useSession();
  const { data: team } = useTeam(teamId);
  const createTodo = useCreateTodo(teamId);
  const owners = (team?.members ?? []).filter((member) => canWrite(member.role));

  return (
    <CommonDrawer
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
      title="Add a To-Do"
      description="A task with one owner. Leave the due date empty for 7 days from today."
    >
      {open ? (
        <CommonForm
          schema={createTodoSchema}
          defaultValues={{
            title: "",
            ownerId: owners.find((owner) => owner.id === user?.id)?.id ?? "",
            dueDate: "",
          }}
          onSubmit={(values) =>
            createTodo.mutate(values, {
              onSuccess: (todo) => {
                toast.success(`To-Do added for ${todo.owner.name}, due ${todo.dueDate}`);
                onClose();
              },
              onError: (error) => toast.error(error.message || "Could not add the To-Do"),
            })
          }
          aria-label="Add a To-Do"
          className="flex flex-1 flex-col gap-5"
        >
          <CommonInput name="title" label="What needs doing?" autoComplete="off" autoFocus />
          <CommonSelect
            name="ownerId"
            label="Owner"
            placeholder="Pick an owner"
            options={owners.map((owner) => ({ value: owner.id, label: owner.name }))}
          />
          <div className="grid gap-2">
            <CommonInput name="dueDate" label="Due date (optional)" type="date" />
            <p className="text-sm text-muted-foreground">
              Leave it empty for 7 days from today. Pick a date in last week to see how a late tick
              is counted.
            </p>
          </div>
          <div className="mt-auto flex justify-end gap-2 border-t border-border pt-5">
            <CommonButton type="button" variant="ghost" onClick={onClose}>
              Cancel
            </CommonButton>
            <CommonFormSubmit loading={createTodo.isPending}>Add To-Do</CommonFormSubmit>
          </div>
        </CommonForm>
      ) : null}
    </CommonDrawer>
  );
}
