import { useRouter } from "next/router";

import {
  isApiError,
  type ApiError,
  type DemoAccounts,
  type LoginInput,
  type User,
} from "@repo/library";
import { apiRequest, apiUrl } from "@repo/library/apis";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { setAuthHint } from "@/lib/auth";

export const sessionKey = ["session"] as const;

export function useSession() {
  const query = useQuery<User | null>({
    queryKey: sessionKey,
    queryFn: async () => {
      try {
        const user = await apiRequest<User>("get", apiUrl("auth", "me"));
        setAuthHint(true);
        return user;
      } catch (error) {
        if (!isApiError(error) || error.status !== 401) throw error;
        setAuthHint(false);
        return null;
      }
    },
    retry: false,
    staleTime: Infinity,
  });

  return {
    user: query.data ?? null,
    isAuthenticated: Boolean(query.data),
    isLoading: query.isLoading,
  };
}

export function useDemoAccounts() {
  return useQuery<DemoAccounts, ApiError>({
    queryKey: ["auth", "demo-accounts"],
    queryFn: () => apiRequest<DemoAccounts>("get", apiUrl("auth", "demo-accounts")),
    retry: false,
    staleTime: Infinity,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation<User, ApiError, LoginInput>({
    mutationFn: (credentials) => apiRequest<User>("post", apiUrl("auth", "login"), credentials),
    onSuccess: (user) => {
      setAuthHint(true);
      queryClient.setQueryData(sessionKey, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => apiRequest<void>("post", apiUrl("auth", "logout")),
    onSettled: () => {
      setAuthHint(false);
      queryClient.clear();
      void router.replace("/auth/login");
    },
  });
}
