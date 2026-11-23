import { AppLayout } from "@/components/layout/app-layout";
import { PageTitle } from "@/components/layout/page-title";
import { IssuesPage } from "@/components/issues/issues-page";
import { useTeamId } from "@/hooks/use-team-id";
import type { NextPageWithLayout } from "@/pages/_app";

const Page: NextPageWithLayout = () => {
  const teamId = useTeamId();

  return (
    <>
      <PageTitle title="Issues" />
      {teamId ? <IssuesPage teamId={teamId} /> : null}
    </>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;
