import { CheckIcon, MinusIcon, ShieldCheckIcon } from "@phosphor-icons/react";

import { Role, ROLE_LABELS } from "@repo/library";
import { SectionCard } from "@repo/ui";

const ROLES = [Role.ADMIN, Role.TEAM_MEMBER, Role.OBSERVER];

const PERMISSIONS: { label: string; roles: Role[] }[] = [
  { label: "See the Scorecard, Issues, To-Dos and Rocks", roles: ROLES },
  { label: "Sit in on the Level 10 Meeting", roles: ROLES },
  {
    label: "Enter scores, add and solve Issues, tick To-Dos",
    roles: [Role.ADMIN, Role.TEAM_MEMBER],
  },
  { label: "Start, run and rate meetings", roles: [Role.ADMIN, Role.TEAM_MEMBER] },
  { label: "Own Measurables, Rocks, Issues and To-Dos", roles: [Role.ADMIN, Role.TEAM_MEMBER] },
  { label: "Open every team", roles: [Role.ADMIN] },
  { label: "Add people and change roles", roles: [Role.ADMIN] },
];

export function RoleGuide({ className }: { className?: string }) {
  return (
    <SectionCard
      icon={ShieldCheckIcon}
      title="What each role can do"
      description="Roles are checked by the server on every request, not just hidden in the page."
      className={className}
    >
      <div>
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="pb-3 text-left align-bottom font-semibold text-muted-foreground"
              >
                Permission
              </th>
              {ROLES.map((role) => (
                <th
                  key={role}
                  scope="col"
                  className="w-[68px] pb-3 text-center align-bottom text-xs font-semibold leading-tight"
                >
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {PERMISSIONS.map((permission) => (
              <tr key={permission.label}>
                <th scope="row" className="py-3 pr-3 text-left font-medium">
                  {permission.label}
                </th>
                {ROLES.map((role) => (
                  <td key={role} className="py-3 text-center">
                    {permission.roles.includes(role) ? (
                      <CheckIcon
                        weight="bold"
                        aria-label="Yes"
                        className="mx-auto size-5 text-success"
                      />
                    ) : (
                      <MinusIcon
                        aria-label="No"
                        className="mx-auto size-5 text-muted-foreground/50"
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
