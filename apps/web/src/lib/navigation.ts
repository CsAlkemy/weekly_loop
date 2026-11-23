import {
  ChartBarIcon,
  FlaskIcon,
  GearSixIcon,
  type Icon as PhosphorIcon,
  ListChecksIcon,
  MountainsIcon,
  PresentationIcon,
  SquaresFourIcon,
  UsersThreeIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

export interface NavItem {
  label: string;
  href: string;
  icon: PhosphorIcon;
}

export const SETTINGS_PATH = "/admin/settings";
export const TESTING_TOOLS_PATH = "/admin/settings/testing";

export function teamPath(teamId: string): string {
  return `/teams/${teamId}`;
}

export function meetingPath(teamId: string): string {
  return `/teams/${teamId}/meeting`;
}

export function meetingSummaryPath(teamId: string, meetingId: string): string {
  return `/teams/${teamId}/meetings/${meetingId}`;
}

export type TeamSection = "scorecard" | "issues" | "todos" | "rocks";

export function sectionPath(teamId: string, section: TeamSection): string {
  return `/teams/${teamId}/${section}`;
}

export function teamNavigation(teamId: string): NavItem[] {
  return [
    { label: "Overview", href: teamPath(teamId), icon: SquaresFourIcon },
    { label: "Scorecard", href: sectionPath(teamId, "scorecard"), icon: ChartBarIcon },
    { label: "Issues", href: sectionPath(teamId, "issues"), icon: WarningCircleIcon },
    { label: "To-Dos", href: sectionPath(teamId, "todos"), icon: ListChecksIcon },
    { label: "Rocks", href: sectionPath(teamId, "rocks"), icon: MountainsIcon },
    { label: "Level 10 Meeting", href: meetingPath(teamId), icon: PresentationIcon },
  ];
}

export const ADMIN_NAVIGATION: NavItem[] = [
  { label: "Settings", href: SETTINGS_PATH, icon: GearSixIcon },
];

export const SETTINGS_TABS: NavItem[] = [
  { label: "Users & roles", href: SETTINGS_PATH, icon: UsersThreeIcon },
  { label: "Testing tools", href: TESTING_TOOLS_PATH, icon: FlaskIcon },
];

const PAGE_TITLES: Record<string, string> = {
  "/teams/[teamId]": "Overview",
  "/teams/[teamId]/scorecard": "Scorecard",
  "/teams/[teamId]/issues": "Issues",
  "/teams/[teamId]/todos": "To-Dos",
  "/teams/[teamId]/rocks": "Rocks",
  "/teams/[teamId]/meeting": "Level 10 Meeting",
  "/teams/[teamId]/meetings/[meetingId]": "Meeting summary",
  [SETTINGS_PATH]: "Settings",
  [TESTING_TOOLS_PATH]: "Settings",
};

export function pageTitle(pathname: string): string | null {
  return PAGE_TITLES[pathname] ?? null;
}
