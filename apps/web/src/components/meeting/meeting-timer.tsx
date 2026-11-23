import { formatClock, type Meeting } from "@repo/library";
import { cn } from "@repo/ui";

import { useSectionElapsed } from "@/hooks/use-meeting";

export function MeetingTimer({ meeting, receivedAt }: { meeting: Meeting; receivedAt: number }) {
  const elapsed = useSectionElapsed(meeting, receivedAt);
  const current = meeting.agenda.find((item) => item.section === meeting.section);
  const allotted = (current?.minutes ?? 0) * 60_000;
  const over = elapsed > allotted;
  const progress = allotted === 0 ? 100 : Math.min(100, (elapsed / allotted) * 100);

  return (
    <div
      className={cn("min-w-56 rounded-xl px-5 py-4", over ? "bg-destructive-soft" : "bg-muted")}
      role="timer"
      aria-label={`${current?.label ?? "Section"} timer`}
    >
      <p className="text-sm font-semibold text-muted-foreground">Time in {current?.label}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span
          className={cn(
            "text-[40px] font-bold leading-none tracking-tight tabular-nums",
            over && "text-destructive",
          )}
        >
          {formatClock(elapsed)}
        </span>
        <span className="text-sm text-muted-foreground">of {current?.minutes ?? 0}:00</span>
      </p>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-card">
        <div
          className={cn("h-full rounded-full", over ? "bg-destructive" : "bg-primary")}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p
        className={cn(
          "mt-2 text-sm font-semibold",
          over ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {over
          ? `Over time by ${formatClock(elapsed - allotted)}`
          : `${formatClock(allotted - elapsed)} left`}
      </p>
    </div>
  );
}
