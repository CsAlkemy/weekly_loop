import { useState } from "react";

import { ArrowRightIcon, CheckIcon } from "@phosphor-icons/react";

import type { Meeting, User } from "@repo/library";
import { cn, CommonButton, CommonModal, toast, UserAvatar } from "@repo/ui";

import { MeetingTimer } from "@/components/meeting/meeting-timer";
import { useAdvanceMeeting, useEndMeeting } from "@/hooks/use-meeting";

interface MeetingBarProps {
  teamId: string;
  meeting: Meeting;
  receivedAt: number;
  user: User;
}

export function MeetingBar({ teamId, meeting, receivedAt, user }: MeetingBarProps) {
  const advance = useAdvanceMeeting(teamId);
  const end = useEndMeeting(teamId);
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  const isFacilitator = meeting.facilitator.id === user.id;
  const position = meeting.agenda.findIndex((item) => item.section === meeting.section);
  const upcoming = meeting.agenda[position + 1];

  const endMeeting = () =>
    end.mutate(undefined, {
      onSuccess: () => setConfirmingEnd(false),
      onError: (error) => toast.error(error.message || "Could not end the meeting"),
    });

  return (
    <div className="sticky top-[92px] z-20 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-5">
        <ol aria-label="Agenda" className="grid min-w-72 flex-1 gap-3 sm:grid-cols-3">
          {meeting.agenda.map((item, index) => {
            const done = index < position;
            const current = index === position;

            return (
              <li
                key={item.section}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3.5",
                  current ? "border-primary bg-accent" : "border-border",
                  done && "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    current
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-success-soft text-success"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <CheckIcon aria-hidden weight="bold" className="size-4" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className={cn("block font-semibold", current && "text-primary")}>
                    {item.label}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {done ? "Done" : current ? "Now" : "Up next"} · {item.minutes} min
                  </span>
                </span>
                {done ? <span className="sr-only">(done)</span> : null}
              </li>
            );
          })}
        </ol>

        <MeetingTimer meeting={meeting} receivedAt={receivedAt} />

        {isFacilitator ? (
          <div className="flex shrink-0 flex-col gap-2">
            {upcoming ? (
              <>
                <CommonButton
                  type="button"
                  size="lg"
                  loading={advance.isPending}
                  onClick={() =>
                    advance.mutate(undefined, {
                      onError: (error) => toast.error(error.message || "Could not move on"),
                    })
                  }
                >
                  Next: {upcoming.label}
                  <ArrowRightIcon aria-hidden weight="bold" />
                </CommonButton>
                <CommonButton type="button" variant="ghost" onClick={() => setConfirmingEnd(true)}>
                  End meeting
                </CommonButton>
              </>
            ) : (
              <CommonButton
                type="button"
                size="lg"
                variant="dark"
                onClick={() => setConfirmingEnd(true)}
              >
                End meeting
              </CommonButton>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">
          {isFacilitator ? "You are facilitating" : `${meeting.facilitator.name} is facilitating`}
        </span>
        <span aria-hidden>·</span>
        <span>In the room:</span>
        <ul aria-label="Attendees" className="flex flex-wrap items-center gap-2">
          {meeting.attendees.map((attendee) => (
            <li
              key={attendee.id}
              className="flex items-center gap-2 rounded-full bg-muted py-1 pl-1 pr-3 font-medium text-foreground"
            >
              <UserAvatar name={attendee.name} className="size-6" fallbackClassName="text-[10px]" />
              {attendee.name}
            </li>
          ))}
        </ul>
      </div>

      <CommonModal
        open={confirmingEnd}
        onOpenChange={setConfirmingEnd}
        title="End the meeting for everyone?"
        description="Ratings close and everyone in the meeting sees the summary."
        footer={
          <>
            <CommonButton type="button" variant="ghost" onClick={() => setConfirmingEnd(false)}>
              Keep going
            </CommonButton>
            <CommonButton type="button" loading={end.isPending} onClick={endMeeting}>
              End meeting
            </CommonButton>
          </>
        }
      />
    </div>
  );
}
