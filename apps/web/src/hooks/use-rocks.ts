import type { ApiError, CreateRockInput, Issue, Rock } from "@repo/library";
import { apiRequest, apiUrl } from "@repo/library/apis";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { issuesKey } from "@/hooks/use-issues";
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

export function useMakeIssueFromRock(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation<Issue, ApiError, { rockId: string }>({
    mutationFn: ({ rockId }) => apiRequest<Issue>("post", rocksUrl(teamId, `/${rockId}/issue`)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: rocksKey(teamId) }),
        queryClient.invalidateQueries({ queryKey: issuesKey(teamId) }),
      ]),
  });
}
