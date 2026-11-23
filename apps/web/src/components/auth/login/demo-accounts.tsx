import { useState } from "react";

import { CaretRightIcon, UserSwitchIcon } from "@phosphor-icons/react";

import { ROLE_LABELS, type User } from "@repo/library";
import { Pill, Popover, PopoverContent, PopoverTrigger, UserAvatar } from "@repo/ui";

import { useDemoAccounts } from "@/hooks/use-auth";

interface DemoAccountsProps {
  disabled: boolean;
  onPick: (user: User, password: string) => void;
}

export function DemoAccounts({ disabled, onPick }: DemoAccountsProps) {
  const { data: accounts } = useDemoAccounts();
  const [open, setOpen] = useState(false);

  if (!accounts || accounts.users.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="mx-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
        >
          <UserSwitchIcon aria-hidden className="size-4" />
          Use a demo account
        </button>
      </PopoverTrigger>
      <PopoverContent aria-label="Demo accounts" className="w-[360px] max-w-[calc(100vw-2rem)] p-2">
        <div className="px-3 pb-2 pt-2">
          <p className="font-semibold">Demo accounts</p>
          <p className="text-sm text-muted-foreground">
            Pick one and we fill in the form and sign you in.
          </p>
        </div>
        <ul className="max-h-[min(420px,60dvh)] overflow-y-auto">
          {accounts.users.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPick(user, accounts.password);
                }}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <UserAvatar name={user.name} className="size-9" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{user.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                </span>
                <Pill>{ROLE_LABELS[user.role]}</Pill>
                <CaretRightIcon
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
