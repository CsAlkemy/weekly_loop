import { useRouter } from "next/router";

import { AppLayout } from "@/components/layout/app-layout";
import { PageTitle } from "@/components/layout/page-title";
import { MeetingView } from "@/components/meeting/meeting-view";
import type { NextPageWithLayout } from "@/pages/_app";

const MeetingPage: NextPageWithLayout = () => {
  const { query } = useRouter();
  const teamId = typeof query.teamId === "string" ? query.teamId : null;

  return (
    <>
      <PageTitle title="Level 10 Meeting" />
      {teamId ? <MeetingView teamId={teamId} /> : null}
    </>
  );
};

MeetingPage.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default MeetingPage;
