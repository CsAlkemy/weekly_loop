import { cn } from "../lib/cn";

const TONES = {
  primary: "bg-primary",
  success: "bg-success",
  danger: "bg-destructive",
} as const;

interface ProgressBarProps {
  value: number;
  label: string;
  tone?: keyof typeof TONES;
  target?: number;
  className?: string;
}

export function ProgressBar({
  value,
  label,
  tone = "primary",
  target,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn("relative block h-2.5 rounded-full bg-muted", className)}
    >
      <span
        className={cn("block h-full rounded-full transition-[width]", TONES[tone])}
        style={{ width: `${clamped}%` }}
      />
      {target === undefined ? null : (
        <span
          aria-hidden
          className="absolute -bottom-1.5 -top-1.5 w-[3px] -translate-x-1/2 rounded-full bg-ink"
          style={{ left: `${target}%` }}
        />
      )}
    </span>
  );
}
