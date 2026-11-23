import { useRouter } from "next/router";

import { loginSchema, type LoginInput } from "@repo/library";
import { CommonForm, CommonFormSubmit, CommonInput, toast, type CommonFormApi } from "@repo/ui";

import { DemoAccounts } from "@/components/auth/login/demo-accounts";
import { Wordmark } from "@/components/layout/logo-mark";
import { useLogin } from "@/hooks/use-auth";

export function LoginView() {
  const router = useRouter();
  const login = useLogin();

  const signIn = (credentials: LoginInput, form: CommonFormApi<typeof loginSchema>) =>
    login.mutate(credentials, {
      onSuccess: () => void router.push("/teams"),
      onError: (error) => {
        const message = error.message || "Unable to sign in right now";
        if (error.status === 401) form.setError("password", { message });
        else toast.error(message);
      },
    });

  return (
    <main className="flex min-h-dvh items-center justify-center bg-accent px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-10">
          <Wordmark />
          <h1 className="mt-8 text-[32px] font-bold leading-tight">Sign in</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Your team&apos;s weekly numbers, issues, to-dos and meetings in one place.
          </p>

          <CommonForm
            schema={loginSchema}
            defaultValues={{ email: "", password: "" }}
            onSubmit={signIn}
            aria-label="Sign in"
            className="mt-8 gap-5"
          >
            {(form) => (
              <>
                <CommonInput
                  name="email"
                  label="Work email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@company.com"
                />
                <CommonInput
                  name="password"
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                />
                <CommonFormSubmit loading={login.isPending} size="lg" className="mt-2 w-full">
                  Sign in
                </CommonFormSubmit>
                <DemoAccounts
                  disabled={login.isPending}
                  onPick={(user, password) => {
                    form.clearErrors();
                    form.setValue("email", user.email);
                    form.setValue("password", password);
                    void form.handleSubmit((values) => signIn(values, form))();
                  }}
                />
              </>
            )}
          </CommonForm>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account yet? Ask an Admin on your team to add you.
        </p>
      </div>
    </main>
  );
}
