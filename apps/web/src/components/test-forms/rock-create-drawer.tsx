import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useFieldArray, useFormContext } from "react-hook-form";

import {
  canWrite,
  createRockSchema,
  RockStatus,
  ROCK_STATUS_OPTIONS,
  type CreateRockInput,
} from "@repo/library";
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
import { useCreateRock } from "@/hooks/use-rocks";
import { useTeam } from "@/hooks/use-teams";

function MilestoneRows() {
  const { control } = useFormContext<CreateRockInput>();
  const { fields, append, remove } = useFieldArray({ control, name: "milestones" });

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-semibold">Milestones</legend>
      <p className="-mt-1 text-sm text-muted-foreground">
        A Milestone due before today that is not done makes the Rock off track.
      </p>
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-[1fr_10rem_2.75rem] items-start gap-2">
          <CommonInput
            name={`milestones.${index}.title`}
            aria-label={`Milestone ${index + 1}`}
            placeholder={`Milestone ${index + 1}`}
            autoComplete="off"
          />
          <CommonInput
            name={`milestones.${index}.dueDate`}
            aria-label={`Due date of Milestone ${index + 1}`}
            type="date"
          />
          <button
            type="button"
            onClick={() => remove(index)}
            aria-label={`Remove Milestone ${index + 1}`}
            className="mt-0.5 flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive"
          >
            <TrashIcon aria-hidden className="size-[18px]" />
          </button>
        </div>
      ))}
      <CommonButton
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => append({ title: "", dueDate: "" })}
      >
        <PlusIcon aria-hidden weight="bold" />
        Add a Milestone
      </CommonButton>
    </fieldset>
  );
}

interface RockCreateDrawerProps {
  teamId: string;
  open: boolean;
  onClose: () => void;
}

export function RockCreateDrawer({ teamId, open, onClose }: RockCreateDrawerProps) {
  const { user } = useSession();
  const { data: team } = useTeam(teamId);
  const createRock = useCreateRock(teamId);
  const owners = (team?.members ?? []).filter((member) => canWrite(member.role));

  return (
    <CommonDrawer
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
      title="Add a Rock"
      description="A goal for this quarter, with the Milestones that lead to it."
      className="w-[560px]"
    >
      {open ? (
        <CommonForm
          schema={createRockSchema}
          defaultValues={{
            title: "",
            ownerId: owners.find((owner) => owner.id === user?.id)?.id ?? "",
            status: RockStatus.ON_TRACK,
            milestones: [{ title: "", dueDate: "" }],
          }}
          onSubmit={(values) =>
            createRock.mutate(values, {
              onSuccess: (rock) => {
                toast.success(`Rock added: ${rock.title} (${rock.progressPercent}%)`);
                onClose();
              },
              onError: (error) => toast.error(error.message || "Could not add the Rock"),
            })
          }
          aria-label="Add a Rock"
          className="flex flex-1 flex-col gap-5"
        >
          <CommonInput name="title" label="Quarterly goal" autoComplete="off" autoFocus />
          <div className="grid gap-5 sm:grid-cols-2">
            <CommonSelect
              name="ownerId"
              label="Owner"
              placeholder="Pick an owner"
              options={owners.map((owner) => ({ value: owner.id, label: owner.name }))}
            />
            <CommonSelect
              name="status"
              label="Status set by the owner"
              options={ROCK_STATUS_OPTIONS}
            />
          </div>
          <MilestoneRows />
          <div className="mt-auto flex justify-end gap-2 border-t border-border pt-5">
            <CommonButton type="button" variant="ghost" onClick={onClose}>
              Cancel
            </CommonButton>
            <CommonFormSubmit loading={createRock.isPending}>Add Rock</CommonFormSubmit>
          </div>
        </CommonForm>
      ) : null}
    </CommonDrawer>
  );
}
