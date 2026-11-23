import { cn } from "@repo/ui";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-9 shrink-0", className)}>
      <rect width="32" height="32" rx="10" className="fill-primary" />
      <path
        d="M16 9a7 7 0 1 0 7 7"
        fill="none"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="22.6" cy="9.6" r="2.1" fill="white" />
    </svg>
  );
}

export function Wordmark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {collapsed ? null : (
        <span className="text-[21px] font-bold lowercase leading-none tracking-tight">
          weekly loop
        </span>
      )}
    </span>
  );
}
