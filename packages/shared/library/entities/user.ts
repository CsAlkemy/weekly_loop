import type { Role } from "../enum/role";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ManagedUser extends User {
  teamIds: string[];
}

export interface DemoAccounts {
  users: User[];
  password: string;
}
