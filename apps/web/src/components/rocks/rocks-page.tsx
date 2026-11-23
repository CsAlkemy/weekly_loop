import { useState } from "react";

import { PlusIcon } from "@phosphor-icons/react";

import { canWrite } from "@repo/library";
import { Card, CommonButton, ListSkeleton, toast } from "@repo/ui";

import { RockRow } from "@/components/rocks/rock-row";
import { TeamPage } from "@/components/team/team-page";
import { RockCreateDrawer } from "@/components/test-forms/rock-create-drawer";
import { useSession } from "@/hooks/use-auth";
import { useTestForms } from "@/hooks/use-settings";
import { useRocks, useSetMilestoneDone } from "@/hooks/use-rocks";

function RockGrid({ teamId }: { teamId: string }) {
  const { data: rocks, isLoading, error } = useRocks(teamId);
  const { user } = useSession();
  const testForms = useTestForms();
  const setMilestone = useSetMilestoneDone(teamId);
  const [adding, setAdding] = useState(false);
  const editable = testForms && Boolean(user && canWrite(user.role));

  const toolbar = editable ? (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <CommonButton type="button" onClick={() => setAdding(true)}>
        <PlusIcon aria-hidden weight="bold" />
        Add Rock
      </CommonButton>
      <RockCreateDrawer teamId={teamId} open={adding} onClose={() => setAdding(false)} />
    </div>
  ) : null;

  const toggle = (rockId: string) => (milestoneId: string, done: boolean) =>
    setMilestone.mutate(
      { rockId, milestoneId, done },
      { onError: (toggleError) => toast.error(toggleError.message || "Could not update it") },
    );

  if (isLoading) {
    return (
      <Card className="p-6">
        <ListSkeleton rows={4} />
      </Card>
    );
  }
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!rocks || rocks.length === 0) {
    return (
      <>
        {toolbar}
        <Card className="p-6 text-muted-foreground">No Rocks this quarter.</Card>
      </>
    );
  }

  return (
    <>
      {toolbar}
      <ul aria-label="Rocks" className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
        {rocks.map((rock) => (
          <RockRow
            key={rock.id}
            rock={rock}
            onToggleMilestone={editable ? toggle(rock.id) : undefined}
          />
        ))}
      </ul>
    </>
  );
}

export function RocksPage({ teamId }: { teamId: string }) {
  return (
    <TeamPage
      teamId={teamId}
      title="Rocks"
      subtitle={(team) =>
        `${team.name} · this quarter's big goals. Click one to see its milestones`
      }
    >
      {(team) => <RockGrid teamId={team.id} />}
    </TeamPage>
  );
}
