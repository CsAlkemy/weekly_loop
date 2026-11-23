import type { ActivityEntry, ApiError } from "@repo/library";
import { apiRequest, apiUrl } from "@repo/library/apis";
import { useQuery } from "@tanstack/react-query";

import { teamKey } from "@/hooks/use-teams";

export const activityKey = (teamId: string) => [...teamKey(teamId), "activity"] as const;

export function useActivity(teamId: string) {
  return useQuery<ActivityEntry[], ApiError>({
    queryKey: activityKey(teamId),
    queryFn: () => apiRequest<ActivityEntry[]>("get", apiUrl("teams", `${teamId}/activity`)),
  });
}
