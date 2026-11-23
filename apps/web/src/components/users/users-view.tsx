import { useState } from "react";

import {
  EyeIcon,
  PencilSimpleIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";

import { Role, ROLE_LABELS, type ManagedUser } from "@repo/library";
import {
  CommonButton,
  ListSkeleton,
  Pill,
  SectionCard,
  StatTile,
  UserAvatar,
  type PillTone,
} from "@repo/ui";

import { SettingsShell } from "@/components/settings/settings-shell";
import { RoleGuide } from "@/components/users/role-guide";
import { UserFormModal } from "@/components/users/user-form-modal";
import { useSession } from "@/hooks/use-auth";
import { useTeams } from "@/hooks/use-teams";
import { useUsers } from "@/hooks/use-users";

const ROLE_TONES: Record<Role, PillTone> = {
  [Role.ADMIN]: "primary",
  [Role.TEAM_MEMBER]: "success",
  [Role.OBSERVER]: "neutral",
};

export function UsersView() {
  const { user: me } = useSession();
  const isAdmin = me?.role === Role.ADMIN;
  const { data: users, isLoading, error } = useUsers(isAdmin);
  const { data: teams = [] } = useTeams();
  const [editing, setEditing] = useState<ManagedUser | "new" | null>(null);

  const teamName = new Map(teams.map((team) => [team.id, team.name]));
  const count = (role: Role) => users?.filter((user) => user.role === role).length ?? 0;

  return (
    <SettingsShell
      action={
        <CommonButton type="button" size="lg" onClick={() => setEditing("new")}>
          <PlusIcon aria-hidden weight="bold" />
          Add user
        </CommonButton>
      }
    >
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={UsersThreeIcon}
          label="People"
          value={users?.length ?? 0}
          loading={isLoading}
          hint="Everyone who can sign in"
        />
        <StatTile
          icon={ShieldCheckIcon}
          label="Admins"
          value={count(Role.ADMIN)}
          loading={isLoading}
          hint="Open every team, manage users"
        />
        <StatTile
          icon={UserIcon}
          label="Team Members"
          value={count(Role.TEAM_MEMBER)}
          loading={isLoading}
          hint="Do the work in their teams"
        />
        <StatTile
          icon={EyeIcon}
          label="Observers"
          value={count(Role.OBSERVER)}
          loading={isLoading}
          hint="Read along, change nothing"
        />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-12">
        <SectionCard
          icon={UsersThreeIcon}
          title="People"
          description="Everyone in the company, with their role and teams."
          className="xl:col-span-7"
        >
          {isLoading ? <ListSkeleton rows={6} avatar /> : null}
          {error ? <p className="text-destructive">{error.message}</p> : null}
          {users ? (
            <ul aria-label="Users" className="-mt-2 divide-y divide-border">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="grid items-center gap-x-4 gap-y-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar name={user.name} className="size-11 shrink-0" />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {user.name}
                        {user.id === me?.id ? <Pill>You</Pill> : null}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <Pill tone={ROLE_TONES[user.role]} className="text-sm">
                      {ROLE_LABELS[user.role]}
                    </Pill>
                    {user.teamIds.length === 0 ? (
                      <span className="text-sm text-muted-foreground">
                        {user.role === Role.ADMIN ? "All teams" : "No team yet"}
                      </span>
                    ) : (
                      user.teamIds.map((teamId) => (
                        <Pill key={teamId} className="text-sm text-foreground">
                          {teamName.get(teamId) ?? teamId}
                        </Pill>
                      ))
                    )}
                  </div>
                  <CommonButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(user)}
                    aria-label={`Edit ${user.name}`}
                  >
                    <PencilSimpleIcon aria-hidden />
                    Edit
                  </CommonButton>
                </li>
              ))}
            </ul>
          ) : null}
        </SectionCard>

        <RoleGuide className="xl:col-span-5" />
      </div>

      <UserFormModal
        open={editing !== null}
        user={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
      />
    </SettingsShell>
  );
}
