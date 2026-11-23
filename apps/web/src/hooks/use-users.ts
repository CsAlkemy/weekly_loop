import type { ApiError, CreateUserInput, ManagedUser } from "@repo/library";
import { apiRequest, apiUrl } from "@repo/library/apis";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { sessionKey } from "@/hooks/use-auth";
import { teamsKey } from "@/hooks/use-teams";

export const usersKey = ["users"] as const;

export type UserChanges = Partial<CreateUserInput> & { userId: string };

function useRefreshPeople() {
  const queryClient = useQueryClient();

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: usersKey }),
      queryClient.invalidateQueries({ queryKey: teamsKey }),
      queryClient.invalidateQueries({ queryKey: sessionKey }),
    ]);
}

export function useUsers(enabled: boolean) {
  return useQuery<ManagedUser[], ApiError>({
    queryKey: usersKey,
    queryFn: () => apiRequest<ManagedUser[]>("get", apiUrl("users")),
    enabled,
  });
}

export function useCreateUser() {
  const refresh = useRefreshPeople();

  return useMutation<ManagedUser, ApiError, CreateUserInput>({
    mutationFn: (input) => apiRequest<ManagedUser>("post", apiUrl("users"), input),
    onSuccess: () => refresh(),
  });
}

export function useUpdateUser() {
  const refresh = useRefreshPeople();

  return useMutation<ManagedUser, ApiError, UserChanges>({
    mutationFn: ({ userId, ...changes }) =>
      apiRequest<ManagedUser>("patch", apiUrl("users", userId), changes),
    onSuccess: () => refresh(),
  });
}
