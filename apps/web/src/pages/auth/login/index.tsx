import { LoginView } from "@/components/auth/login";
import { PageTitle } from "@/components/layout/page-title";

export default function LoginPage() {
  return (
    <>
      <PageTitle title="Sign in" />
      <LoginView />
    </>
  );
}
