import { ListChecksIcon, StarIcon } from "@phosphor-icons/react";

import { canWrite, formatDate, type Meeting, type User } from "@repo/library";
import { cn, ListSkeleton, SectionCard, toast } from "@repo/ui";

import { useRateMeeting } from "@/hooks/use-meeting";
import { useTodos } from "@/hooks/use-todos";

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface MeetingConcludeProps {
  teamId: string;
  meeting: Meeting;
  user: User;
}

export function MeetingConclude({ teamId, meeting, user }: MeetingConcludeProps) {
  const { data: todos, isLoading } = useTodos(teamId);
  const rate = useRateMeeting(teamId);

  const ratings = new Map(meeting.ratings.map((item) => [item.userId, item.rating]));
  const myRating = rate.isPending ? rate.variables : ratings.get(user.id);
  const canRate =
    canWrite(user.role) && meeting.attendees.some((attendee) => attendee.id === user.id);
  const newTodos = (todos?.todos ?? []).filter(
    (todo) => Date.parse(todo.createdAt) >= Date.parse(meeting.startedAt),
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <SectionCard
        icon={ListChecksIcon}
        title="New To-Dos"
        description="Created in this meeting. Each is due in 7 days."
      >
        {isLoading ? <ListSkeleton rows={3} trailing={false} /> : null}
        {todos && newTodos.length === 0 ? (
          <p className="text-muted-foreground">No To-Dos were created in this meeting.</p>
        ) : null}
        {newTodos.length > 0 ? (
          <ul aria-label="New To-Dos" className="divide-y divide-border">
            {newTodos.map((todo) => (
              <li key={todo.id} className="flex items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{todo.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {todo.owner.name}
                    {todo.sourceIssue ? ` · from Issue: ${todo.sourceIssue.title}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-muted-foreground">
                  Due {formatDate(todo.dueDate)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </SectionCard>

      <SectionCard
        icon={StarIcon}
        title="Rate the meeting"
        description="1 is poor, 10 is great. You can change your rating until the meeting ends."
        action={
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold text-muted-foreground">Average so far</p>
            <p className="text-[32px] font-bold leading-tight tracking-tight tabular-nums">
              {meeting.averageRating === null ? "–" : meeting.averageRating.toFixed(1)}
            </p>
          </div>
        }
      >
        {canRate ? (
          <div role="radiogroup" aria-label="Your rating" className="flex flex-wrap gap-2">
            {RATINGS.map((rating) => (
              <button
                key={rating}
                type="button"
                role="radio"
                aria-checked={myRating === rating}
                onClick={() =>
                  rate.mutate(rating, {
                    onError: (error) => toast.error(error.message || "Could not save your rating"),
                  })
                }
                className={cn(
                  "size-12 rounded-full border text-base font-bold tabular-nums transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2",
                  myRating === rating
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-card hover:border-primary hover:bg-accent hover:text-primary",
                )}
              >
                {rating}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            {canWrite(user.role) ? "Join the meeting to rate it." : "Observers do not rate."}
          </p>
        )}

        <ul aria-label="Ratings" className="mt-5 divide-y divide-border border-t border-border">
          {meeting.attendees.map((attendee) => (
            <li key={attendee.id} className="flex items-center justify-between py-3">
              <span>{attendee.name}</span>
              <span
                className={cn(
                  "tabular-nums",
                  ratings.has(attendee.id) ? "font-semibold" : "text-muted-foreground",
                )}
              >
                {ratings.get(attendee.id) ??
                  (canWrite(attendee.role) ? "Not rated yet" : "Observer")}
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
