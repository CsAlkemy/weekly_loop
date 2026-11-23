import { useEffect, useState } from "react";

import type { ActiveMeeting, ApiError, Meeting, MeetingSummary, PastMeeting } from "@repo/library";
import { apiRequest, apiUrl } from "@repo/library/apis";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { teamKey } from "@/hooks/use-teams";

export const meetingKey = (teamId: string) => [...teamKey(teamId), "meeting"] as const;

const meetingUrl = (teamId: string, path = "") => apiUrl("teams", `${teamId}/meeting${path}`);

export function useMeeting(teamId: string) {
  return useQuery<ActiveMeeting, ApiError>({
    queryKey: meetingKey(teamId),
    queryFn: () => apiRequest<ActiveMeeting>("get", meetingUrl(teamId)),
  });
}

export function usePastMeetings(teamId: string) {
  return useQuery<PastMeeting[], ApiError>({
    queryKey: [...meetingKey(teamId), "past"],
    queryFn: () => apiRequest<PastMeeting[]>("get", apiUrl("teams", `${teamId}/meetings`)),
  });
}

function useMeetingAction<TVariables = void>(
  teamId: string,
  request: (variables: TVariables) => Promise<Meeting>,
) {
  const queryClient = useQueryClient();

  return useMutation<Meeting, ApiError, TVariables>({
    mutationFn: request,
    onSuccess: (meeting) => {
      queryClient.setQueryData<ActiveMeeting>(meetingKey(teamId), (current) => ({
        lastEndedMeetingId: current?.lastEndedMeetingId ?? null,
        meeting,
      }));
    },
  });
}

export function useStartMeeting(teamId: string) {
  return useMeetingAction(teamId, () => apiRequest<Meeting>("post", meetingUrl(teamId)));
}

export function useJoinMeeting(teamId: string) {
  return useMeetingAction(teamId, () => apiRequest<Meeting>("post", meetingUrl(teamId, "/join")));
}

export function useAdvanceMeeting(teamId: string) {
  return useMeetingAction(teamId, () =>
    apiRequest<Meeting>("post", meetingUrl(teamId, "/advance")),
  );
}

export function useRateMeeting(teamId: string) {
  return useMeetingAction<number>(teamId, (rating) =>
    apiRequest<Meeting>("put", meetingUrl(teamId, "/rating"), { rating }),
  );
}

export function useEndMeeting(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation<MeetingSummary, ApiError, void>({
    mutationFn: () => apiRequest<MeetingSummary>("post", meetingUrl(teamId, "/end")),
    onSuccess: (summary) => {
      queryClient.setQueryData(summaryKey(teamId, summary.id), summary);
      queryClient.setQueryData<ActiveMeeting>(meetingKey(teamId), {
        meeting: null,
        lastEndedMeetingId: summary.id,
      });
    },
  });
}

export const summaryKey = (teamId: string, meetingId: string) =>
  [...teamKey(teamId), "meeting-summary", meetingId] as const;

export function useMeetingSummary(teamId: string, meetingId: string) {
  return useQuery<MeetingSummary, ApiError>({
    queryKey: summaryKey(teamId, meetingId),
    queryFn: () =>
      apiRequest<MeetingSummary>("get", apiUrl("teams", `${teamId}/meetings/${meetingId}/summary`)),
  });
}

export function useSectionElapsed(meeting: Meeting, receivedAt: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [meeting.sectionStartedAt, receivedAt]);

  const atReceipt = Date.parse(meeting.serverNow) - Date.parse(meeting.sectionStartedAt);
  return Math.max(0, atReceipt + (now - receivedAt));
}
