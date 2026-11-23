import type {
  ApiError,
  CreateMeasurableInput,
  Issue,
  Measurable,
  ScoreCell,
  Scorecard,
} from "@repo/library";
import { apiRequest, apiUrl } from "@repo/library/apis";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { issuesKey } from "@/hooks/use-issues";
import { teamKey } from "@/hooks/use-teams";

export const scorecardKey = (teamId: string) => [...teamKey(teamId), "scorecard"] as const;

export function useScorecard(teamId: string) {
  return useQuery<Scorecard, ApiError>({
    queryKey: scorecardKey(teamId),
    queryFn: () => apiRequest<Scorecard>("get", apiUrl("teams", `${teamId}/scorecard`)),
  });
}

export function useCreateMeasurable(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation<Measurable, ApiError, CreateMeasurableInput>({
    mutationFn: (input) =>
      apiRequest<Measurable>("post", apiUrl("teams", `${teamId}/measurables`), input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scorecardKey(teamId) }),
  });
}

export interface SetScoreInput {
  measurableId: string;
  weekStart: string;
  value: number | null;
}

export function useSetScore(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation<ScoreCell, ApiError, SetScoreInput>({
    mutationFn: ({ measurableId, weekStart, value }) => {
      const url = apiUrl("teams", `${teamId}/measurables/${measurableId}/scores/${weekStart}`);
      return value === null
        ? apiRequest<ScoreCell>("delete", url)
        : apiRequest<ScoreCell>("put", url, { value });
    },
    onSuccess: (cell, { measurableId }) => {
      queryClient.setQueryData<Scorecard>(scorecardKey(teamId), (current) =>
        current
          ? {
              ...current,
              measurables: current.measurables.map((measurable) =>
                measurable.id === measurableId
                  ? {
                      ...measurable,
                      cells: measurable.cells.map((existing) =>
                        existing.weekStart === cell.weekStart ? cell : existing,
                      ),
                    }
                  : measurable,
              ),
            }
          : current,
      );
      return queryClient.invalidateQueries({ queryKey: scorecardKey(teamId) });
    },
  });
}

export interface MakeIssueInput {
  measurableId: string;
  weekStart: string;
}

export function useMakeIssue(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation<Issue, ApiError, MakeIssueInput>({
    mutationFn: ({ measurableId, weekStart }) =>
      apiRequest<Issue>(
        "post",
        apiUrl("teams", `${teamId}/measurables/${measurableId}/scores/${weekStart}/issue`),
      ),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: scorecardKey(teamId) }),
        queryClient.invalidateQueries({ queryKey: issuesKey(teamId) }),
      ]),
  });
}
