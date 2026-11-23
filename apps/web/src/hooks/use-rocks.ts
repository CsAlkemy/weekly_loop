import type { ApiError, CreateRockInput, Rock } from "@repo/library";
import { apiRequest, apiUrl } from "@repo/library/apis";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { teamKey } from "@/hooks/use-teams";

export const rocksKey = (teamId: string) => [...teamKey(teamId), "rocks"] as const;

export function useRocks(teamId: string) {
  return useQuery<Rock[], ApiError>({
    queryKey: rocksKey(teamId),
    queryFn: () => apiRequest<Rock[]>("get", apiUrl("teams", `${teamId}/rocks`)),
  });
}

const rocksUrl = (teamId: string, path = "") => apiUrl("teams", `${teamId}/rocks${path}`);

export function useCreateRock(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation<Rock, ApiError, CreateRockInput>({
    mutationFn: (input) => apiRequest<Rock>("post", rocksUrl(teamId), input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rocksKey(teamId) }),
  });
}

export function useSetMilestoneDone(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation<Rock, ApiError, { rockId: string; milestoneId: string; done: boolean }>({
    mutationFn: ({ rockId, milestoneId, done }) =>
      apiRequest<Rock>(
        done ? "put" : "delete",
        rocksUrl(teamId, `/${rockId}/milestones/${milestoneId}/done`),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rocksKey(teamId) }),
  });
}
