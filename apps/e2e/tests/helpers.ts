import {
  expect,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";

const openContexts: BrowserContext[] = [];

export async function resetData(request: APIRequestContext) {
  const response = await request.post("/api/testing/reset");
  expect(response.status(), "API must run with ENABLE_TEST_ROUTES=true").toBe(204);
}

export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "weekly-loop-demo";

export async function turnOnTestForms(request: APIRequestContext) {
  const login = await request.post("/api/auth/login", {
    data: { email: seedEmail("Avery"), password: SEED_PASSWORD },
  });
  expect(login.status()).toBe(200);
  const response = await request.patch("/api/settings", { data: { testForms: true } });
  expect(response.status(), "API must run with ENABLE_TEST_TOOLS=true").toBe(200);
}

export function seedEmail(name: string): string {
  return `${name.split(" ")[0]?.toLowerCase()}@acme.test`;
}

export async function signInWith(page: Page, email: string, password: string) {
  const form = page.getByRole("form", { name: "Sign in" });
  await form.getByLabel("Work email").fill(email);
  await form.getByLabel("Password", { exact: true }).fill(password);
  await form.getByRole("button", { name: "Sign in" }).click();
}

export async function signIn(page: Page, name: string, team = "Leadership") {
  await page.goto("/");
  await signInWith(page, seedEmail(name), SEED_PASSWORD);
  await expect(page.getByRole("heading", { name: team })).toBeVisible();
}

export type TeamPageName = "Overview" | "Scorecard" | "Issues" | "To-Dos" | "Rocks";

export async function openPage(page: Page, name: TeamPageName) {
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name, exact: true })
    .click();
  if (name !== "Overview") {
    await expect(page.getByRole("heading", { level: 1, name, exact: true })).toBeVisible();
  }
}

export async function signedInBrowser(
  browser: Browser,
  name: string,
  open?: TeamPageName,
): Promise<Page> {
  const context = await browser.newContext();
  openContexts.push(context);
  const page = await context.newPage();
  await signIn(page, name);
  if (open) await openPage(page, open);
  return page;
}

export async function closeBrowsers() {
  await Promise.all(openContexts.splice(0).map((context) => context.close()));
}
