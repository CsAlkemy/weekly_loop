import { useRouter } from "next/router";

export function useTeamId(): string | null {
  const { query } = useRouter();
  return typeof query.teamId === "string" ? query.teamId : null;
}
