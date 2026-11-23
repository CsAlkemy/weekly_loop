import { AppLayout } from "@/components/layout/app-layout";
import { PageTitle } from "@/components/layout/page-title";
import { RocksPage } from "@/components/rocks/rocks-page";
import { useTeamId } from "@/hooks/use-team-id";
import type { NextPageWithLayout } from "@/pages/_app";

const Page: NextPageWithLayout = () => {
  const teamId = useTeamId();

  return (
    <>
      <PageTitle title="Rocks" />
      {teamId ? <RocksPage teamId={teamId} /> : null}
    </>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;
