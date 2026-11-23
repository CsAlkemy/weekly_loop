import { expect, test } from "@playwright/test";

import { openPage, resetData, SEED_PASSWORD, signIn, signInWith } from "./helpers";

test.beforeEach(({ request }) => resetData(request));

test("a seeded user signs in and lands on their team", async ({ page }) => {
  await signIn(page, "Blake Brooks");
  await expect(page.getByText("Live", { exact: true })).toBeVisible();
});

test("email and password sign in, and a wrong password is refused", async ({ page }) => {
  const form = page.getByRole("form", { name: "Sign in" });

  await page.goto("/");
  await expect(page.getByText("avery@acme.test")).toHaveCount(0);
  await signInWith(page, "casey@acme.test", "not-the-password");
  await expect(form.getByText("Incorrect email or password")).toBeVisible();

  await signInWith(page, "casey@acme.test", SEED_PASSWORD);
  await expect(page.getByRole("heading", { name: "Leadership" })).toBeVisible();

  await page.getByRole("button", { name: "Open account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(form).toBeVisible();
  await page.goto("/teams/team_lead");
  await expect(form).toBeVisible();
});

test("a demo account fills in the form and signs in", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Use a demo account" }).click();
  const demo = page.getByRole("dialog", { name: "Demo accounts" });
  await expect(demo.getByRole("button")).toHaveCount(9);

  await demo.getByRole("button", { name: /Blake Brooks/ }).click();

  await expect(page.getByRole("heading", { name: "Leadership" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open account menu" })).toContainText(
    "Blake Brooks",
  );
});

test("the overview charts show each part of the team at a glance", async ({ page }) => {
  await signIn(page, "Casey Cho");

  await expect(page.getByRole("img", { name: /Last week 2 of 5 met/ })).toBeVisible();
  await expect(
    page.getByRole("img", { name: /To-Do completion for the last 8 weeks/ }),
  ).toBeVisible();
  const priorities = page
    .getByRole("list", { name: "Open Issues by priority" })
    .getByRole("listitem");
  await expect(priorities.first()).toHaveText("5 · Highest2");
  const rocks = page.getByRole("list", { name: "Rocks progress" });
  await expect(rocks.getByRole("listitem").filter({ hasText: "Hire VP of Sales" })).toContainText(
    "Off track13%",
  );
});

test("a team the user is not on is refused", async ({ page }) => {
  await signIn(page, "Finley Ford", "Sales");

  await page.goto("/teams/team_lead");
  await expect(page.getByRole("heading", { name: "No access to this team" })).toBeVisible();
});

test("a Rock expands to show its Milestones", async ({ page }) => {
  await signIn(page, "Casey Cho");
  await openPage(page, "Rocks");

  const rock = page.getByRole("button", { name: /Hire VP of Sales/ });
  await expect(rock).toContainText("Off track");
  await expect(rock).toContainText("13%");

  await rock.click();
  await expect(page.getByText("Shortlist of 5")).toBeVisible();
  await expect(page.getByText("Past due")).toBeVisible();
});

test("the side nav has one page per section and no in-page links", async ({ page }) => {
  await signIn(page, "Casey Cho");
  const links = page.getByRole("navigation", { name: "Primary" }).getByRole("link");
  await expect(links).toHaveText([
    "Overview",
    "Scorecard",
    "Issues",
    "To-Dos",
    "Rocks",
    "Level 10 Meeting",
  ]);
  for (const href of await links.evaluateAll((all) => all.map((a) => a.getAttribute("href")))) {
    expect(href).not.toContain("#");
  }

  for (const name of ["Scorecard", "Issues", "To-Dos", "Rocks"] as const) {
    await openPage(page, name);
    await expect(
      page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name, exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }
});

test("the side nav switches pages and remembers being collapsed", async ({ page }) => {
  await signIn(page, "Casey Cho");

  const nav = page.getByRole("navigation", { name: "Primary" });
  await nav.getByRole("link", { name: "Level 10 Meeting" }).click();
  await expect(page.getByRole("heading", { name: "Level 10 Meeting" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Level 10 Meeting" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
});

test("the team page shows skeletons while it loads", async ({ page }) => {
  await signIn(page, "Casey Cho");

  await page.route("**/api/teams/team_lead", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.reload();

  await expect(page.getByRole("status", { name: "Loading" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Leadership" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Loading" })).toHaveCount(0);
});
