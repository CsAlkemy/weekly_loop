import {
  canWrite,
  createMeasurableSchema,
  GOAL_TYPE_OPTIONS,
  GoalType,
  UNIT_OPTIONS,
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
import { useCreateMeasurable } from "@/hooks/use-scorecard";
import { useTeam } from "@/hooks/use-teams";

interface NewMeasurableModalProps {
  teamId: string;
  open: boolean;
  onClose: () => void;
}

export function NewMeasurableModal({ teamId, open, onClose }: NewMeasurableModalProps) {
  const { user } = useSession();
  const { data: team } = useTeam(teamId);
  const createMeasurable = useCreateMeasurable(teamId);

  const owners = (team?.members ?? []).filter((member) => canWrite(member.role));
  const defaultOwner = owners.find((owner) => owner.id === user?.id)?.id ?? "";

  return (
    <CommonModal
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
      title="New measurable"
      description="A number the team checks every week. Its first week is this week."
      className="max-h-[92dvh] overflow-y-auto sm:max-w-xl"
    >
      {open ? (
        <CommonForm
          schema={createMeasurableSchema}
          defaultValues={{
            name: "",
            ownerId: defaultOwner,
            unit: "count",
            goalType: GoalType.AT_LEAST,
            goalValue: "",
            goalMin: "",
            goalMax: "",
          }}
          onSubmit={(values, form) =>
            createMeasurable.mutate(values, {
              onSuccess: (measurable) => {
                toast.success(`${measurable.name} added to the Scorecard`);
                onClose();
              },
              onError: (error) =>
                error.status === 409
                  ? form.setError("name", { message: error.message })
                  : toast.error(error.message || "Could not add the measurable"),
            })
          }
          aria-label="New measurable"
          className="gap-5"
        >
          {(form) => (
            <>
              <CommonInput
                name="name"
                label="What do you measure?"
                placeholder="For example: Qualified leads"
                autoComplete="off"
                autoFocus
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <CommonSelect
                  name="ownerId"
                  label="Owner"
                  placeholder="Pick an owner"
                  options={owners.map((owner) => ({ value: owner.id, label: owner.name }))}
                />
                <CommonSelect name="unit" label="Unit" options={UNIT_OPTIONS} />
              </div>
              <div className="grid gap-5 sm:grid-cols-[11rem_1fr]">
                <CommonSelect name="goalType" label="Weekly goal" options={GOAL_TYPE_OPTIONS} />
                {form.watch("goalType") === GoalType.BETWEEN ? (
                  <div className="grid grid-cols-2 gap-3">
                    <CommonInput name="goalMin" label="From" inputMode="decimal" />
                    <CommonInput name="goalMax" label="To" inputMode="decimal" />
                  </div>
                ) : (
                  <CommonInput name="goalValue" label="Number" inputMode="decimal" />
                )}
              </div>
              <p className="-mt-1 text-sm text-muted-foreground">
                Weeks that reach the goal show green; weeks that miss it show red.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <CommonButton type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </CommonButton>
                <CommonFormSubmit loading={createMeasurable.isPending}>
                  Add measurable
                </CommonFormSubmit>
              </div>
            </>
          )}
        </CommonForm>
      ) : null}
    </CommonModal>
  );
}
