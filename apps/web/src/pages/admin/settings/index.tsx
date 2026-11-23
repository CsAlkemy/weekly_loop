import { AppLayout } from "@/components/layout/app-layout";
import { PageTitle } from "@/components/layout/page-title";
import { UsersView } from "@/components/users/users-view";
import type { NextPageWithLayout } from "@/pages/_app";

const SettingsPage: NextPageWithLayout = () => (
  <>
    <PageTitle title="Users & roles · Settings" />
    <UsersView />
  </>
);

SettingsPage.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default SettingsPage;
