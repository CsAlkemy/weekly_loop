import type { ApiError, CompanySettings } from "@repo/library";
import { apiRequest, apiUrl } from "@repo/library/apis";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const settingsKey = ["settings"] as const;

export function useSettings() {
  return useQuery<CompanySettings, ApiError>({
    queryKey: settingsKey,
    queryFn: () => apiRequest<CompanySettings>("get", apiUrl("settings")),
  });
}

export function useTestForms() {
  return useSettings().data?.testForms ?? false;
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation<CompanySettings, ApiError, Pick<CompanySettings, "testForms">>({
    mutationFn: (changes) => apiRequest<CompanySettings>("patch", apiUrl("settings"), changes),
    onSuccess: (settings) => queryClient.setQueryData(settingsKey, settings),
  });
}

export function useResetToSeed() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError>({
    mutationFn: () => apiRequest<void>("post", apiUrl("settings", "reset-to-seed")),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
