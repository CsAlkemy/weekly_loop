import { IssuesSection } from "@/components/issues/issues-section";
import { TeamPage } from "@/components/team/team-page";

export function IssuesPage({ teamId }: { teamId: string }) {
  return (
    <TeamPage
      teamId={teamId}
      title="Issues"
      subtitle={(team) => `${team.name} · problems, ideas and blockers to talk through`}
    >
      {(team) => <IssuesSection teamId={team.id} timeZone={team.timezone} title="Issue list" />}
    </TeamPage>
  );
}
