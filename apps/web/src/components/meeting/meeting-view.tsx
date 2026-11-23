import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";

import { isApiError, MeetingSection } from "@repo/library";
import { CardSkeleton, CommonButton, PageHeaderSkeleton } from "@repo/ui";

import { IssuesSection } from "@/components/issues/issues-section";
import { LiveIndicator } from "@/components/layout/live-indicator";
import { PAGE_CLASS, PageHeader } from "@/components/layout/page-header";
import { MeetingBar } from "@/components/meeting/meeting-bar";
import { MeetingConclude } from "@/components/meeting/meeting-conclude";
import { MeetingLobby } from "@/components/meeting/meeting-lobby";
import { PastMeetings } from "@/components/meeting/past-meetings";
import { ScorecardSection } from "@/components/scorecard/scorecard-section";
import { useSession } from "@/hooks/use-auth";
import { useJoinMeeting, useMeeting } from "@/hooks/use-meeting";
import { useTeamChannel } from "@/hooks/use-realtime";
import { useTeam } from "@/hooks/use-teams";
import { meetingSummaryPath, teamPath } from "@/lib/navigation";

export function MeetingView({ teamId }: { teamId: string }) {
  const router = useRouter();
  const { user } = useSession();
  const { data: team, error: teamError, isLoading: teamLoading } = useTeam(teamId);
  const live = useTeamChannel(team?.id);
  const { data: active, dataUpdatedAt, isLoading: meetingLoading } = useMeeting(teamId);
  const join = useJoinMeeting(teamId);

  const attendedId = useRef<string | null>(null);
  const joinedId = useRef<string | null>(null);

  const meeting = active?.meeting ?? null;
  const attending = Boolean(
    meeting && user && meeting.attendees.some((attendee) => attendee.id === user.id),
  );

  useEffect(() => {
    if (!meeting) {
      if (active && attendedId.current) {
        void router.push(meetingSummaryPath(teamId, attendedId.current));
        attendedId.current = null;
      }
      return;
    }
    attendedId.current = meeting.id;
    if (!attending && joinedId.current !== meeting.id) {
      joinedId.current = meeting.id;
      join.mutate();
    }
  }, [active, meeting, attending, join, router, teamId]);

  if (teamLoading || meetingLoading) {
    return (
      <main className={PAGE_CLASS}>
        <PageHeaderSkeleton />
        <CardSkeleton />
      </main>
    );
  }

  if (teamError || !team || !user) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-bold">
          {isApiError(teamError) && teamError.status === 403
            ? "No access to this team"
            : "Team not found"}
        </h1>
        <CommonButton asChild variant="outline">
          <Link href="/teams">Back to your teams</Link>
        </CommonButton>
      </main>
    );
  }

  return (
    <main className={PAGE_CLASS}>
      <PageHeader
        title="Level 10 Meeting"
        subtitle={`${team.name} · the weekly team meeting in three steps`}
      >
        <LiveIndicator live={live} />
        <CommonButton asChild variant="outline">
          <Link href={teamPath(teamId)}>Back to team</Link>
        </CommonButton>
      </PageHeader>

      {meeting ? (
        <>
          <MeetingBar teamId={teamId} meeting={meeting} receivedAt={dataUpdatedAt} user={user} />
          {meeting.section === MeetingSection.SCORECARD ? (
            <ScorecardSection teamId={teamId} />
          ) : null}
          {meeting.section === MeetingSection.IDS ? (
            <IssuesSection teamId={teamId} timeZone={team.timezone} />
          ) : null}
          {meeting.section === MeetingSection.CONCLUDE ? (
            <MeetingConclude teamId={teamId} meeting={meeting} user={user} />
          ) : null}
        </>
      ) : (
        <>
          <MeetingLobby
            teamId={teamId}
            user={user}
            lastEndedMeetingId={active?.lastEndedMeetingId ?? null}
          />
          <PastMeetings teamId={teamId} timeZone={team.timezone} />
        </>
      )}
    </main>
  );
}
