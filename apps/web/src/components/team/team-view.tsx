import { LastWeekScorecard } from "@/components/scorecard/last-week-scorecard";
import { GoalsChart } from "@/components/team/charts/goals-chart";
import { IssuesPriorityChart } from "@/components/team/charts/issues-priority-chart";
import { RocksChart } from "@/components/team/charts/rocks-chart";
import { TodoTrendChart } from "@/components/team/charts/todo-trend-chart";
import {
  IssuesTile,
  MeetingTile,
  RocksTile,
  ScorecardTile,
  TodosTile,
} from "@/components/team/team-overview";
import { TeamPage } from "@/components/team/team-page";

export function TeamView({ teamId }: { teamId: string }) {
  return (
    <TeamPage
      teamId={teamId}
      subtitle={(team) =>
        `Overview · ${team.members.length} members · weeks run Monday to Sunday, ${team.timezone} time`
      }
    >
      {(team) => (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-12">
          <MeetingTile teamId={team.id} className="md:col-span-2 xl:col-span-4 xl:row-span-2" />
          <ScorecardTile teamId={team.id} className="xl:col-span-4" />
          <IssuesTile teamId={team.id} className="xl:col-span-4" />
          <TodosTile teamId={team.id} className="xl:col-span-4" />
          <RocksTile teamId={team.id} className="xl:col-span-4" />
          <GoalsChart teamId={team.id} className="min-w-0 md:col-span-2 xl:col-span-8" />
          <IssuesPriorityChart teamId={team.id} className="min-w-0 md:col-span-2 xl:col-span-4" />
          <TodoTrendChart teamId={team.id} className="min-w-0 md:col-span-2 xl:col-span-6" />
          <RocksChart teamId={team.id} className="min-w-0 md:col-span-2 xl:col-span-6" />
          <LastWeekScorecard teamId={team.id} className="md:col-span-2 xl:col-span-12" />
        </div>
      )}
    </TeamPage>
  );
}
