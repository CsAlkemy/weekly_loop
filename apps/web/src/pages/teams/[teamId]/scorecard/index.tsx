import { AppLayout } from "@/components/layout/app-layout";
import { PageTitle } from "@/components/layout/page-title";
import { ScorecardPage } from "@/components/scorecard/scorecard-page";
import { useTeamId } from "@/hooks/use-team-id";
import type { NextPageWithLayout } from "@/pages/_app";

const Page: NextPageWithLayout = () => {
  const teamId = useTeamId();

  return (
    <>
      <PageTitle title="Scorecard" />
      {teamId ? <ScorecardPage teamId={teamId} /> : null}
    </>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;
