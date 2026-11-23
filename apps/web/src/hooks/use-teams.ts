import type { ApiError, Team, TeamDetail } from "@repo/library";
import { apiRequest, apiUrl } from "@repo/library/apis";
import { useQuery } from "@tanstack/react-query";

export const teamsKey = ["teams"] as const;
export const teamKey = (teamId: string) => ["teams", teamId] as const;

export function useTeams() {
  return useQuery<Team[], ApiError>({
    queryKey: teamsKey,
    queryFn: () => apiRequest<Team[]>("get", apiUrl("teams")),
  });
}

export function useTeam(teamId: string) {
  return useQuery<TeamDetail, ApiError>({
    queryKey: teamKey(teamId),
    queryFn: () => apiRequest<TeamDetail>("get", apiUrl("teams", teamId)),
  });
}
