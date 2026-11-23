import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useFieldArray, useFormContext } from "react-hook-form";

import {
  addTodosSchema,
  canWrite,
  MAX_TODOS_AT_ONCE,
  type AddTodosInput,
  type Issue,
} from "@repo/library";
import {
  CommonButton,
  CommonForm,
  CommonFormSubmit,
  CommonInput,
  CommonModal,
  CommonSelect,
  toast,
} from "@repo/ui";

import { useSession } from "@/hooks/use-auth";
import { useAddIssueTodos } from "@/hooks/use-issues";
import { useTeam } from "@/hooks/use-teams";

interface AddTodoModalProps {
  teamId: string;
  issue: Issue | null;
  onClose: () => void;
}

interface TodoRowsProps {
  owners: { value: string; label: string }[];
  defaultOwner: string;
  saving: boolean;
  onCancel: () => void;
}

function TodoRows({ owners, defaultOwner, saving, onCancel }: TodoRowsProps) {
  const { control } = useFormContext<AddTodosInput>();
  const { fields, append, remove } = useFieldArray({ control, name: "todos" });
  const count = fields.length;

  return (
    <>
      <div className="grid gap-3">
        <div
          aria-hidden
          className="hidden grid-cols-[2rem_1fr_12rem_2.75rem] gap-3 text-sm font-semibold sm:grid"
        >
          <span />
          <span>What needs doing?</span>
          <span>Owner</span>
          <span />
        </div>
        <ol aria-label="New To-Dos" className="grid gap-3">
          {fields.map((field, index) => (
            <li
              key={field.id}
              className="grid grid-cols-[2rem_1fr_2.75rem] items-start gap-3 sm:grid-cols-[2rem_1fr_12rem_2.75rem]"
            >
              <span className="col-start-1 row-start-1 mt-3 flex size-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-primary">
                {index + 1}
              </span>
              <CommonInput
                name={`todos.${index}.title`}
                aria-label={`To-Do ${index + 1}`}
                placeholder="A task someone can finish this week"
                autoComplete="off"
                autoFocus={index === count - 1}
                containerClassName="col-start-2 row-start-1"
              />
              <CommonSelect
                name={`todos.${index}.ownerId`}
                ariaLabel={`Owner of To-Do ${index + 1}`}
                placeholder="Pick an owner"
                options={owners}
                containerClassName="col-start-2 row-start-2 sm:col-start-3 sm:row-start-1"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={count === 1}
                aria-label={`Remove To-Do ${index + 1}`}
                className="col-start-3 row-start-1 mt-0.5 flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:invisible sm:col-start-4"
              >
                <TrashIcon aria-hidden className="size-[18px]" />
              </button>
            </li>
          ))}
        </ol>
        {count < MAX_TODOS_AT_ONCE ? (
          <CommonButton
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => append({ title: "", ownerId: defaultOwner })}
          >
            <PlusIcon aria-hidden weight="bold" />
            Add another To-Do
          </CommonButton>
        ) : (
          <p className="text-sm text-muted-foreground">
            You can add up to {MAX_TODOS_AT_ONCE} at a time.
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        <p className="mr-auto text-sm text-muted-foreground">Each is due in 7 days.</p>
        <CommonButton type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </CommonButton>
        <CommonFormSubmit loading={saving}>
          {count === 1 ? "Add To-Do" : `Add ${count} To-Dos`}
        </CommonFormSubmit>
      </div>
    </>
  );
}

export function AddTodoModal({ teamId, issue, onClose }: AddTodoModalProps) {
  const { user } = useSession();
  const { data: team } = useTeam(teamId);
  const addTodos = useAddIssueTodos(teamId);

  const owners = (team?.members ?? []).filter((member) => canWrite(member.role));
  const defaultOwner =
    owners.find((owner) => owner.id === user?.id)?.id ??
    owners.find((owner) => owner.id === issue?.owner.id)?.id ??
    "";

  return (
    <CommonModal
      open={issue !== null}
      onOpenChange={(open) => (open ? undefined : onClose())}
      title="Add To-Dos"
      description={issue ? `From Issue: ${issue.title}` : undefined}
      className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl"
    >
      {issue ? (
        <CommonForm
          schema={addTodosSchema}
          defaultValues={{ todos: [{ title: "", ownerId: defaultOwner }] }}
          onSubmit={({ todos }) =>
            addTodos.mutate(
              { issueId: issue.id, todos },
              {
                onSuccess: (created) => {
                  toast.success(
                    created.length === 1
                      ? "To-Do added, due in 7 days"
                      : `${created.length} To-Dos added, due in 7 days`,
                  );
                  onClose();
                },
                onError: (error) => toast.error(error.message || "Could not add the To-Dos"),
              },
            )
          }
          className="gap-5"
        >
          <TodoRows
            owners={owners.map((owner) => ({ value: owner.id, label: owner.name }))}
            defaultOwner={defaultOwner}
            saving={addTodos.isPending}
            onCancel={onClose}
          />
        </CommonForm>
      ) : null}
    </CommonModal>
  );
}
