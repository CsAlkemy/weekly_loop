import { useRouter } from "next/router";
import { useEffect } from "react";

import { CardSkeleton, PageHeaderSkeleton } from "@repo/ui";

import { AppLayout } from "@/components/layout/app-layout";
import { PageTitle } from "@/components/layout/page-title";
import { PAGE_CLASS } from "@/components/layout/page-header";
import { useTeams } from "@/hooks/use-teams";
import type { NextPageWithLayout } from "@/pages/_app";

const TeamsPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { data: teams } = useTeams();
  const firstTeamId = teams?.[0]?.id;

  useEffect(() => {
    if (firstTeamId) void router.replace(`/teams/${firstTeamId}`);
  }, [firstTeamId, router]);

  return (
    <>
      <PageTitle title="Teams" />
      {teams && teams.length === 0 ? (
        <main className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">You are not on any team yet.</p>
        </main>
      ) : (
        <main className={PAGE_CLASS}>
          <PageHeaderSkeleton />
          <CardSkeleton />
        </main>
      )}
    </>
  );
};

TeamsPage.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default TeamsPage;
