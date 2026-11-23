import { AppLayout } from "@/components/layout/app-layout";
import { PageTitle } from "@/components/layout/page-title";
import { TeamView } from "@/components/team/team-view";
import { useTeamId } from "@/hooks/use-team-id";
import type { NextPageWithLayout } from "@/pages/_app";

const TeamPage: NextPageWithLayout = () => {
  const teamId = useTeamId();

  return (
    <>
      <PageTitle title="Overview" />
      {teamId ? <TeamView teamId={teamId} /> : null}
    </>
  );
};

TeamPage.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default TeamPage;
