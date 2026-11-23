import { Role } from "../enum/role";

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: "Admin",
  [Role.TEAM_MEMBER]: "Team Member",
  [Role.OBSERVER]: "Observer",
};

export function canWrite(role: Role): boolean {
  return role !== Role.OBSERVER;
}
