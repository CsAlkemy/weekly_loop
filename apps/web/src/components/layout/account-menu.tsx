import { SignOutIcon } from "@phosphor-icons/react";

import { ROLE_LABELS, type User } from "@repo/library";
import { CommonDropdown, UserAvatar, type CommonDropdownItem } from "@repo/ui";

import { useLogout } from "@/hooks/use-auth";

export function AccountMenu({ user }: { user: User }) {
  const logout = useLogout();

  const items: CommonDropdownItem[] = [
    { type: "label", label: `${user.name} · ${ROLE_LABELS[user.role]}` },
    { type: "label", label: user.email },
    { type: "separator" },
    {
      label: "Sign out",
      icon: <SignOutIcon className="size-5" />,
      onSelect: () => logout.mutate(),
    },
  ];

  return (
    <CommonDropdown
      align="end"
      contentClassName="min-w-64"
      trigger={
        <button
          type="button"
          aria-label="Open account menu"
          className="flex items-center gap-2.5 rounded-full p-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:pr-4"
        >
          <UserAvatar name={user.name} className="size-9" />
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold leading-tight">{user.name}</span>
            <span className="block text-xs leading-tight text-muted-foreground">
              {ROLE_LABELS[user.role]}
            </span>
          </span>
        </button>
      }
      items={items}
    />
  );
}
