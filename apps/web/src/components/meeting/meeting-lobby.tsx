import Link from "next/link";

import { ArrowUpRightIcon, PlayIcon, PresentationIcon } from "@phosphor-icons/react";

import { canWrite, type User } from "@repo/library";
import { CommonButton, Pill, SectionCard, toast } from "@repo/ui";

import { useStartMeeting } from "@/hooks/use-meeting";
import { meetingSummaryPath } from "@/lib/navigation";

const AGENDA = [
  {
    label: "Scorecard",
    minutes: 5,
    about: "Look at last week's numbers. Flag the ones that missed their goal.",
  },
  {
    label: "IDS",
    minutes: 60,
    about: "Identify, Discuss, Solve. Work the Issues list from the top and add To-Dos.",
  },
  { label: "Conclude", minutes: 10, about: "Recap the new To-Dos and rate the meeting 1 to 10." },
];

interface MeetingLobbyProps {
  teamId: string;
  user: User;
  lastEndedMeetingId: string | null;
}

export function MeetingLobby({ teamId, user, lastEndedMeetingId }: MeetingLobbyProps) {
  const start = useStartMeeting(teamId);
  const mayStart = canWrite(user.role);

  return (
    <SectionCard
      icon={PresentationIcon}
      title="No meeting in progress"
      description={
        mayStart
          ? "Start the meeting and you become its facilitator. Teammates join from their own browsers and follow along live."
          : "An Admin or Team Member starts the meeting. This page updates by itself when it begins."
      }
      action={
        mayStart ? (
          <CommonButton
            type="button"
            size="lg"
            loading={start.isPending}
            onClick={() =>
              start.mutate(undefined, {
                onError: (error) => toast.error(error.message || "Could not start the meeting"),
              })
            }
          >
            <PlayIcon aria-hidden weight="fill" />
            Start meeting
          </CommonButton>
        ) : null
      }
    >
      <ol aria-label="Agenda" className="grid gap-4 md:grid-cols-3">
        {AGENDA.map((item, index) => (
          <li key={item.label} className="flex flex-col gap-3 rounded-xl border border-border p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary">
                {index + 1}
              </span>
              <Pill>{item.minutes} min</Pill>
            </div>
            <p className="text-lg font-bold">{item.label}</p>
            <p className="text-sm text-muted-foreground">{item.about}</p>
          </li>
        ))}
      </ol>

      {lastEndedMeetingId ? (
        <CommonButton asChild variant="outline" className="mt-5">
          <Link href={meetingSummaryPath(teamId, lastEndedMeetingId)}>
            View the last meeting&apos;s summary
            <ArrowUpRightIcon aria-hidden />
          </Link>
        </CommonButton>
      ) : null}
    </SectionCard>
  );
}
