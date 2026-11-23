import { ScorecardSection } from "@/components/scorecard/scorecard-section";
import { TeamPage } from "@/components/team/team-page";

export function ScorecardPage({ teamId }: { teamId: string }) {
  return (
    <TeamPage
      teamId={teamId}
      title="Scorecard"
      subtitle={(team) => `${team.name} · the numbers your team checks every week`}
    >
      {(team) => (
        <ScorecardSection
          teamId={team.id}
          title="Last 13 weeks"
          description="Each row is one number, each column is a week, newest on the left."
        />
      )}
    </TeamPage>
  );
}
