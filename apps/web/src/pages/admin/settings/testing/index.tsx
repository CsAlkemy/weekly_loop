import { AppLayout } from "@/components/layout/app-layout";
import { PageTitle } from "@/components/layout/page-title";
import { TestingToolsView } from "@/components/settings/testing-tools-view";
import type { NextPageWithLayout } from "@/pages/_app";

const TestingToolsPage: NextPageWithLayout = () => (
  <>
    <PageTitle title="Testing tools · Settings" />
    <TestingToolsView />
  </>
);

TestingToolsPage.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default TestingToolsPage;
