import {
  createUserSchema,
  editUserSchema,
  Role,
  ROLE_OPTIONS,
  ROLE_SUMMARIES,
  type ManagedUser,
} from "@repo/library";
import {
  CommonButton,
  CommonCheckboxGroup,
  CommonForm,
  CommonFormSubmit,
  CommonInput,
  CommonModal,
  CommonSelect,
  toast,
} from "@repo/ui";

import { useSession } from "@/hooks/use-auth";
import { useTeams } from "@/hooks/use-teams";
import { useCreateUser, useUpdateUser } from "@/hooks/use-users";

interface UserFormModalProps {
  user: ManagedUser | null;
  open: boolean;
  onClose: () => void;
}

function RoleHint({ role }: { role: Role }) {
  return <p className="-mt-2 text-sm text-muted-foreground">{ROLE_SUMMARIES[role]}</p>;
}

export function UserFormModal({ user, open, onClose }: UserFormModalProps) {
  const { user: me } = useSession();
  const { data: teams = [] } = useTeams();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const editingSelf = user !== null && user.id === me?.id;

  const teamOptions = teams.map((team) => ({ value: team.id, label: team.name }));
  const fail = (message: string) => toast.error(message || "Could not save the user");

  const teamField = (
    <CommonCheckboxGroup
      name="teamIds"
      label="Teams"
      hint="Admins can open every team, so teams are optional for them."
      options={teamOptions}
    />
  );

  return (
    <CommonModal
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
      title={user ? `Edit ${user.name}` : "Add a user"}
      description={
        user
          ? "Change their details, role or teams. Changes apply on their next click."
          : "They sign in with this email and password. Share the password with them yourself."
      }
      className="max-h-[92dvh] overflow-y-auto sm:max-w-xl"
    >
      {open && user ? (
        <CommonForm
          key={user.id}
          schema={editUserSchema}
          defaultValues={{
            name: user.name,
            email: user.email,
            role: user.role,
            teamIds: user.teamIds,
            password: "",
          }}
          onSubmit={({ password, ...values }) =>
            updateUser.mutate(
              { userId: user.id, ...values, ...(password ? { password } : {}) },
              {
                onSuccess: (saved) => {
                  toast.success(`${saved.name} updated`);
                  onClose();
                },
                onError: (error) => fail(error.message),
              },
            )
          }
          aria-label="Edit user"
          className="gap-5"
        >
          {(form) => (
            <>
              <CommonInput name="name" label="Full name" autoComplete="off" />
              <CommonInput name="email" label="Work email" type="email" autoComplete="off" />
              <CommonSelect
                name="role"
                label="Role"
                options={ROLE_OPTIONS}
                disabled={editingSelf}
              />
              {editingSelf ? (
                <p className="-mt-2 text-sm text-muted-foreground">
                  You cannot change your own role.
                </p>
              ) : (
                <RoleHint role={form.watch("role")} />
              )}
              {teamField}
              <CommonInput
                name="password"
                label="New password"
                type="password"
                autoComplete="new-password"
                placeholder="Leave blank to keep the current one"
              />
              <div className="flex justify-end gap-2 pt-1">
                <CommonButton type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </CommonButton>
                <CommonFormSubmit loading={updateUser.isPending}>Save changes</CommonFormSubmit>
              </div>
            </>
          )}
        </CommonForm>
      ) : null}

      {open && !user ? (
        <CommonForm
          schema={createUserSchema}
          defaultValues={{
            name: "",
            email: "",
            role: Role.TEAM_MEMBER,
            teamIds: [],
            password: "",
          }}
          onSubmit={(values, form) =>
            createUser.mutate(values, {
              onSuccess: (saved) => {
                toast.success(`${saved.name} added`);
                onClose();
              },
              onError: (error) =>
                error.status === 409
                  ? form.setError("email", { message: error.message })
                  : fail(error.message),
            })
          }
          aria-label="Add a user"
          className="gap-5"
        >
          {(form) => (
            <>
              <CommonInput name="name" label="Full name" autoComplete="off" autoFocus />
              <CommonInput
                name="email"
                label="Work email"
                type="email"
                autoComplete="off"
                placeholder="name@company.com"
              />
              <CommonSelect name="role" label="Role" options={ROLE_OPTIONS} />
              <RoleHint role={form.watch("role")} />
              {teamField}
              <CommonInput
                name="password"
                label="Password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
              <div className="flex justify-end gap-2 pt-1">
                <CommonButton type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </CommonButton>
                <CommonFormSubmit loading={createUser.isPending}>Add user</CommonFormSubmit>
              </div>
            </>
          )}
        </CommonForm>
      ) : null}
    </CommonModal>
  );
}
