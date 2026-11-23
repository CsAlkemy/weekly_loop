import type { ApiError, CreateTodoInput, Issue, Todo, TodoList } from "@repo/library";
import { apiRequest, apiUrl } from "@repo/library/apis";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { issuesKey } from "@/hooks/use-issues";
import { teamKey } from "@/hooks/use-teams";

export const todosKey = (teamId: string) => [...teamKey(teamId), "todos"] as const;

export function useTodos(teamId: string) {
  return useQuery<TodoList, ApiError>({
    queryKey: todosKey(teamId),
    queryFn: () => apiRequest<TodoList>("get", apiUrl("teams", `${teamId}/todos`)),
  });
}

export function useSetTodoDone(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation<Todo, ApiError, { todoId: string; done: boolean }>({
    mutationFn: ({ todoId, done }) =>
      apiRequest<Todo>(done ? "post" : "delete", apiUrl("teams", `${teamId}/todos/${todoId}/done`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosKey(teamId) }),
  });
}

export function useCreateTodo(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation<Todo, ApiError, CreateTodoInput>({
    mutationFn: (input) => apiRequest<Todo>("post", apiUrl("teams", `${teamId}/todos`), input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosKey(teamId) }),
  });
}

export function useMakeIssueFromTodo(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation<Issue, ApiError, { todoId: string }>({
    mutationFn: ({ todoId }) =>
      apiRequest<Issue>("post", apiUrl("teams", `${teamId}/todos/${todoId}/issue`)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: todosKey(teamId) }),
        queryClient.invalidateQueries({ queryKey: issuesKey(teamId) }),
      ]),
  });
}
