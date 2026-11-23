import type {
  AddTodosInput,
  ApiError,
  CreateIssueInput,
  Issue,
  IssueStatus,
  Todo,
} from "@repo/library";
import { apiRequest, apiUrl } from "@repo/library/apis";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { teamKey } from "@/hooks/use-teams";
import { todosKey } from "@/hooks/use-todos";

export const issuesKey = (teamId: string) => [...teamKey(teamId), "issues"] as const;

const issueUrl = (teamId: string, path = "") => apiUrl("teams", `${teamId}/issues${path}`);

export function useIssues(teamId: string, status: IssueStatus) {
  return useQuery<Issue[], ApiError>({
    queryKey: [...issuesKey(teamId), status],
    queryFn: () => apiRequest<Issue[]>("get", `${issueUrl(teamId)}?status=${status}`),
  });
}

export function useCreateIssue(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation<Issue, ApiError, CreateIssueInput>({
    mutationFn: (input) => apiRequest<Issue>("post", issueUrl(teamId), input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: issuesKey(teamId) }),
  });
}

export function useSetIssuePriority(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    Issue,
    ApiError,
    { issueId: string; priority: number | null; expected: number | null }
  >({
    mutationFn: ({ issueId, priority, expected }) =>
      apiRequest<Issue>("patch", issueUrl(teamId, `/${issueId}`), { priority, expected }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: issuesKey(teamId) }),
    onError: (error) => {
      if (error.status === 409) void queryClient.invalidateQueries({ queryKey: issuesKey(teamId) });
    },
  });
}

export function useSolveIssue(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation<Issue, ApiError, { issueId: string; note: string }>({
    mutationFn: ({ issueId, note }) =>
      apiRequest<Issue>("post", issueUrl(teamId, `/${issueId}/solve`), { note }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: issuesKey(teamId) }),
  });
}

export function useAddIssueTodos(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation<Todo[], ApiError, AddTodosInput & { issueId: string }>({
    mutationFn: async ({ issueId, todos }) => {
      const created: Todo[] = [];
      for (const todo of todos) {
        created.push(await apiRequest<Todo>("post", issueUrl(teamId, `/${issueId}/todos`), todo));
      }
      return created;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: todosKey(teamId) }),
  });
}
