import { TeamPage } from "@/components/team/team-page";
import { TodoCompletion } from "@/components/todos/todo-completion";
import { TodosSection } from "@/components/todos/todos-section";

export function TodosPage({ teamId }: { teamId: string }) {
  return (
    <TeamPage
      teamId={teamId}
      title="To-Dos"
      subtitle={(team) => `${team.name} · small tasks with one owner, due within 7 days`}
    >
      {(team) => (
        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-8">
            <TodosSection teamId={team.id} timeZone={team.timezone} />
          </div>
          <TodoCompletion teamId={team.id} className="xl:col-span-4" />
        </div>
      )}
    </TeamPage>
  );
}
