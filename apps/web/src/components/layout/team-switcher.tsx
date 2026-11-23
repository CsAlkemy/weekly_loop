import { useRouter } from "next/router";

import { CaretDownIcon, CheckIcon, UsersThreeIcon } from "@phosphor-icons/react";

import { CommonDropdown, type CommonDropdownItem } from "@repo/ui";

import { useTeams } from "@/hooks/use-teams";

export function TeamSwitcher() {
  const router = useRouter();
  const { data: teams = [] } = useTeams();
  const currentTeamId = typeof router.query.teamId === "string" ? router.query.teamId : null;
  const currentTeam = teams.find((team) => team.id === currentTeamId);

  const items: CommonDropdownItem[] = teams.map((team) => ({
    id: team.id,
    label: team.name,
    icon:
      team.id === currentTeamId ? (
        <CheckIcon weight="bold" className="size-5 text-primary" />
      ) : (
        <span className="size-5" />
      ),
    onSelect: () => router.push(`/teams/${team.id}`),
  }));

  return (
    <CommonDropdown
      align="end"
      contentClassName="min-w-56"
      trigger={
        <button
          type="button"
          aria-label="Switch team"
          className="flex h-11 items-center gap-2.5 rounded-full bg-muted pl-4 pr-3.5 text-[15px] font-semibold transition-colors hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <UsersThreeIcon aria-hidden weight="duotone" className="size-5 text-primary" />
          {currentTeam?.name ?? "All teams"}
          <CaretDownIcon aria-hidden className="size-4 text-muted-foreground" />
        </button>
      }
      items={items}
    />
  );
}
