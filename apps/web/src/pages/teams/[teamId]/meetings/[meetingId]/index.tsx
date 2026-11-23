import { useRouter } from "next/router";

import { AppLayout } from "@/components/layout/app-layout";
import { PageTitle } from "@/components/layout/page-title";
import { MeetingSummary } from "@/components/meeting/meeting-summary";
import type { NextPageWithLayout } from "@/pages/_app";

const MeetingSummaryPage: NextPageWithLayout = () => {
  const { query } = useRouter();
  const teamId = typeof query.teamId === "string" ? query.teamId : null;
  const meetingId = typeof query.meetingId === "string" ? query.meetingId : null;

  return (
    <>
      <PageTitle title="Meeting summary" />
      {teamId && meetingId ? <MeetingSummary teamId={teamId} meetingId={meetingId} /> : null}
    </>
  );
};

MeetingSummaryPage.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default MeetingSummaryPage;
