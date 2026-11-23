import { cn } from "@repo/ui";

export function LiveIndicator({ live }: { live: boolean }) {
  return (
    <span
      aria-live="polite"
      className="flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-muted-foreground"
    >
      <span aria-hidden className="relative flex size-2">
        {live ? (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60" />
        ) : null}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            live ? "bg-success" : "bg-muted-foreground/40",
          )}
        />
      </span>
      {live ? "Live" : "Connecting"}
    </span>
  );
}
