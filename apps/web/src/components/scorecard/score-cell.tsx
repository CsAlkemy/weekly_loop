import { useRef, useState } from "react";

import {
  formatDate,
  formatScore,
  MeasurableStatus,
  scoreValueSchema,
  type ScoreCell as Cell,
} from "@repo/library";
import { cn, Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui";

import { SCORE_STATUS } from "@/components/scorecard/score-status";

interface ScoreCellProps {
  cell: Cell;
  unit: string;
  measurableName: string;
  editable: boolean;
  highlight?: boolean;
  saving: boolean;
  makingIssue: boolean;
  onSave: (value: number | null, expected: number | null) => void;
  onMakeIssue: () => void;
}

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function ScoreCell({
  cell,
  unit,
  measurableName,
  editable,
  highlight = false,
  saving,
  makingIssue,
  onSave,
  onMakeIssue,
}: ScoreCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const settled = useRef(false);
  const seen = useRef<number | null>(null);

  const status = SCORE_STATUS[cell.status];
  const Icon = status.icon;
  const week = formatDate(cell.weekStart);
  const where = `${measurableName}, week of ${week}`;
  const shown = cell.value === null ? "–" : formatScore(cell.value, unit);
  const summary = `${where}: ${cell.value === null ? "no score" : shown}, ${status.label}`;
  const offTrack = cell.status === MeasurableStatus.OFF_TRACK;
  const hasIssue = cell.issueId !== null;

  const startEditing = () => {
    settled.current = false;
    seen.current = cell.value;
    setDraft(cell.value === null ? "" : String(cell.value));
    setInvalid(false);
    setEditing(true);
  };

  const stopEditing = () => {
    settled.current = true;
    setEditing(false);
  };

  const commit = () => {
    if (settled.current) return;
    if (draft.trim() === String(seen.current ?? "")) {
      stopEditing();
      return;
    }
    if (draft.trim() === "") {
      stopEditing();
      onSave(null, seen.current);
      return;
    }
    const parsed = scoreValueSchema.safeParse(draft);
    if (!parsed.success) {
      setInvalid(true);
      return;
    }
    stopEditing();
    onSave(parsed.data, seen.current);
  };

  if (editing) {
    return (
      <input
        autoFocus
        inputMode="decimal"
        value={draft}
        aria-label={`Score for ${where}`}
        aria-invalid={invalid || undefined}
        onChange={(event) => {
          setDraft(event.target.value);
          setInvalid(false);
        }}
        onFocus={(event) => event.target.select()}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") stopEditing();
        }}
        className={cn(
          "h-12 w-full rounded-xl border-2 bg-card px-1 text-center text-[15px] font-semibold tabular-nums outline-none",
          invalid
            ? "border-destructive ring-4 ring-destructive/10"
            : "border-primary ring-4 ring-primary/10",
        )}
      />
    );
  }

  const shape = cn(
    "flex h-12 w-full items-stretch overflow-hidden rounded-xl text-[15px] font-semibold",
    status.cell,
    highlight && "ring-2 ring-primary/35",
    saving && "opacity-60",
  );
  const flag = <Icon aria-hidden weight={hasIssue ? "fill" : "bold"} className="size-4 shrink-0" />;

  if (!editable) {
    return (
      <div className={cn(shape, "items-center justify-center gap-1 px-1")} title={status.label}>
        <span className="tabular-nums">{shown}</span>
        <span className={status.tone}>{flag}</span>
        <span className="sr-only">
          {summary}
          {hasIssue ? ", Issue open" : ""}
        </span>
      </div>
    );
  }

  return (
    <div className={shape}>
      <button
        type="button"
        onClick={startEditing}
        disabled={saving}
        title="Click to edit"
        aria-label={`${summary}. Edit score`}
        className={cn(
          "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-1 transition-colors hover:bg-foreground/5",
          FOCUS,
        )}
      >
        <span className="tabular-nums">{shown}</span>
        {offTrack ? null : <span className={status.tone}>{flag}</span>}
      </button>

      {offTrack ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onMakeIssue}
              disabled={makingIssue}
              aria-label={hasIssue ? `Issue open for ${where}` : `Make it an Issue: ${where}`}
              className={cn(
                "flex w-8 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-destructive/15",
                status.tone,
                makingIssue && "opacity-60",
                FOCUS,
              )}
            >
              {flag}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {hasIssue ? "Already on the Issues list" : "Make it an Issue"}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
