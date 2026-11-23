import { useId, useState } from "react";

import { CaretDownIcon, CheckCircleIcon, CircleIcon } from "@phosphor-icons/react";

import { formatDate, RockStatus, type Rock } from "@repo/library";
import { Checkbox, cn, Pill, ProgressBar, StatusBadge } from "@repo/ui";

import { MakeIssueButton } from "@/components/issues/make-issue-button";

interface RockRowProps {
  rock: Rock;
  onToggleMilestone?: (milestoneId: string, done: boolean) => void;
  makingIssue?: boolean;
  onMakeIssue?: () => void;
}

export function RockRow({
  rock,
  onToggleMilestone,
  makingIssue = false,
  onMakeIssue,
}: RockRowProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const doneCount = rock.milestones.filter((milestone) => milestone.done).length;

  return (
    <li
      className={cn(
        "rounded-2xl border bg-card transition-colors",
        open ? "border-primary/40" : "border-border",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="grid w-full gap-4 rounded-2xl p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <span className="flex items-start gap-3">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-snug">{rock.title}</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              {rock.owner.name} ·{" "}
              {rock.milestones.length
                ? `${doneCount} of ${rock.milestones.length} milestones done`
                : "No milestones"}
            </span>
          </span>
          <StatusBadge status={rock.status} />
        </span>
        <span className="flex items-center gap-3">
          <ProgressBar
            value={rock.progressPercent}
            label={`${rock.title} progress`}
            tone={rock.status === RockStatus.OFF_TRACK ? "danger" : "primary"}
            className="flex-1"
          />
          <span className="w-10 text-right text-sm font-bold tabular-nums">
            {rock.progressPercent}%
          </span>
          <CaretDownIcon
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </span>
      </button>

      {rock.openIssueId || (rock.status === RockStatus.OFF_TRACK && onMakeIssue) ? (
        <div className="-mt-1 px-5 pb-5">
          <MakeIssueButton
            subject={rock.title}
            onIssues={rock.openIssueId !== null}
            pending={makingIssue}
            onClick={() => onMakeIssue?.()}
          />
        </div>
      ) : null}

      {open ? (
        <div id={panelId} className="mx-5 mb-5 rounded-xl bg-muted p-4">
          {rock.milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground">This Rock has no Milestones.</p>
          ) : (
            <ul className="grid gap-2.5">
              {rock.milestones.map((milestone) => (
                <li key={milestone.id} className="flex flex-wrap items-center gap-2 text-sm">
                  {onToggleMilestone ? (
                    <Checkbox
                      checked={milestone.done}
                      onCheckedChange={(checked) =>
                        onToggleMilestone(milestone.id, checked === true)
                      }
                      aria-label={`Mark "${milestone.title}" ${milestone.done ? "not done" : "done"}`}
                    />
                  ) : milestone.done ? (
                    <CheckCircleIcon
                      aria-hidden
                      weight="fill"
                      className="size-5 shrink-0 text-success"
                    />
                  ) : (
                    <CircleIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="sr-only">{milestone.done ? "Done:" : "Not done:"}</span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 font-medium",
                      milestone.done && "text-muted-foreground line-through",
                    )}
                  >
                    {milestone.title}
                  </span>
                  {milestone.pastDue ? <Pill tone="danger">Past due</Pill> : null}
                  <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                    Due {formatDate(milestone.dueDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </li>
  );
}
