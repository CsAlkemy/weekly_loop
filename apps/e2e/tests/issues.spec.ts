import { expect, test, type Page } from "@playwright/test";

import { closeBrowsers, openPage, resetData, signedInBrowser, signIn } from "./helpers";

test.beforeEach(({ request }) => resetData(request));
test.afterEach(closeBrowsers);

const issues = (page: Page) => page.locator("#issues");
const unsolved = (page: Page) => page.getByRole("list", { name: "Unsolved Issues" });
const rows = (page: Page) => unsolved(page).getByRole("listitem");

test("Issues are listed in Issue order with their source", async ({ page }) => {
  await signIn(page, "Casey Cho");
  await openPage(page, "Issues");

  await expect(rows(page)).toHaveCount(5);
  await expect(rows(page).nth(0)).toContainText("Two key accounts at risk");
  await expect(rows(page).nth(1)).toContainText("Hiring pipeline is slow");
  await expect(rows(page).nth(2)).toContainText("New deals closed, week of Nov 2");
  await expect(rows(page).nth(2)).toContainText("From scorecard: New deals closed, week of Nov 2");
  await expect(rows(page).nth(4)).toContainText("Idea: quarterly customer survey");

  await issues(page).getByRole("tab", { name: "Solved (2)" }).click();
  const solved = page.getByRole("list", { name: "Solved Issues" });
  await expect(solved.getByRole("listitem").first()).toContainText("Payroll runs, week of Oct 26");
  await expect(solved).toContainText("Bank holiday moved the run; added a reminder.");
});

test("an Issue is added from the drawer and lands in priority order", async ({ page }) => {
  await signIn(page, "Casey Cho");
  await openPage(page, "Issues");

  await issues(page).getByRole("button", { name: "Add Issue" }).click();
  const drawer = page.getByRole("dialog", { name: "Add an Issue" });
  await expect(drawer).toContainText("What happens next");
  await drawer.getByRole("button", { name: "Add Issue" }).click();
  await expect(drawer.getByText("Give it a title")).toBeVisible();

  await drawer.getByLabel("What needs solving?").fill("Slow invoicing");
  await drawer.getByLabel("Details (optional)").fill("Invoices take 9 days to go out.");
  await drawer.getByRole("combobox", { name: "Priority" }).click();
  await page.getByRole("option", { name: "5 · Highest" }).click();
  await drawer.getByRole("button", { name: "Add Issue" }).click();

  await expect(drawer).toBeHidden();
  await expect(rows(page)).toHaveCount(6);
  await expect(rows(page).nth(2)).toContainText("Slow invoicing");
  await expect(rows(page).nth(2)).toContainText("Casey Cho");
  await expect(rows(page).nth(2)).toContainText("Invoices take 9 days to go out.");

  await issues(page).getByRole("button", { name: "Add Issue" }).click();
  await expect(drawer.getByLabel("What needs solving?")).toHaveValue("");
  await drawer.getByRole("button", { name: "Cancel" }).click();
  await expect(drawer).toBeHidden();
});

test("the list can be filtered and sorted by priority", async ({ page }) => {
  await signIn(page, "Casey Cho");
  await openPage(page, "Issues");
  const filter = issues(page).getByRole("combobox", { name: "Filter by priority" });

  await filter.click();
  await page.getByRole("option", { name: "5 · Highest (2)" }).click();
  await expect(rows(page)).toHaveCount(2);
  await expect(issues(page).getByText("Showing 2 of 5")).toBeVisible();

  await filter.click();
  await page.getByRole("option", { name: "2 · Low (0)" }).click();
  await expect(issues(page).getByText("No Issues have this priority.")).toBeVisible();
  await issues(page).getByRole("button", { name: "Show all priorities" }).click();
  await expect(rows(page)).toHaveCount(5);

  await issues(page).getByRole("combobox", { name: "Sort by" }).click();
  await page.getByRole("option", { name: "Lowest priority first" }).click();
  await expect(rows(page).nth(0)).toContainText("Idea: quarterly customer survey");
  await expect(rows(page).nth(4)).toContainText("Hiring pipeline is slow");
});

test("changing an Issue's priority reorders the list", async ({ page }) => {
  await signIn(page, "Casey Cho");
  await openPage(page, "Issues");

  await page
    .getByRole("combobox", { name: 'Priority of "Idea: quarterly customer survey"' })
    .click();
  await page.getByRole("option", { name: "5 · Highest" }).click();

  await expect(rows(page).nth(0)).toContainText("Idea: quarterly customer survey");
});

test("an Issue is solved with a required note", async ({ page }) => {
  await signIn(page, "Casey Cho");
  await openPage(page, "Issues");

  await page.getByRole("button", { name: 'Solve "Support coverage on weekends"' }).click();
  const dialog = page.getByRole("dialog", { name: "Solve Issue" });
  await dialog.getByRole("button", { name: "Solve Issue" }).click();
  await expect(dialog.getByText("Say how it was resolved")).toBeVisible();

  await dialog.getByLabel("How was it resolved?").fill("Hired a weekend agent.");
  await dialog.getByRole("button", { name: "Solve Issue" }).click();

  await expect(dialog).toBeHidden();
  await expect(unsolved(page)).not.toContainText("Support coverage on weekends");
  await issues(page).getByRole("tab", { name: "Solved (3)" }).click();
  const solved = page.getByRole("list", { name: "Solved Issues" });
  const first = solved.getByRole("listitem").first();
  await expect(first).toContainText("Support coverage on weekends");
  await expect(first).toContainText("Dana Diaz");
  await expect(first).toContainText("by Casey Cho");
  await expect(solved).toContainText("Hired a weekend agent.");
});

test("several To-Dos are added from an Issue at once, linked and due in 7 days", async ({
  page,
}) => {
  await signIn(page, "Casey Cho");
  await openPage(page, "Issues");

  await page.getByRole("button", { name: 'Add a To-Do for "Hiring pipeline is slow"' }).click();
  const dialog = page.getByRole("dialog", { name: "Add To-Dos" });
  await dialog.getByLabel("To-Do 1", { exact: true }).fill("Post the job ad");
  await dialog.getByRole("combobox", { name: "Owner of To-Do 1" }).click();
  await page.getByRole("option", { name: "Dana Diaz" }).click();

  await dialog.getByRole("button", { name: "Add another To-Do" }).click();
  await dialog.getByRole("button", { name: "Add another To-Do" }).click();
  await dialog.getByLabel("To-Do 2", { exact: true }).fill("Ask for two referrals");
  await dialog.getByRole("button", { name: "Remove To-Do 3" }).click();
  await expect(dialog.getByRole("combobox", { name: "Owner of To-Do 2" })).toHaveText("Casey Cho");
  await dialog.getByRole("button", { name: "Add 2 To-Dos" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText("2 To-Dos added, due in 7 days")).toBeVisible();
  await openPage(page, "To-Dos");
  const open = page.getByRole("list", { name: "Open To-Dos" }).getByRole("listitem");
  await expect(open.filter({ hasText: "Post the job ad" })).toContainText(
    "Dana Diaz · from Issue: Hiring pipeline is slow",
  );
  await expect(open.filter({ hasText: "Post the job ad" })).toContainText("Due Nov 18");
  await expect(open.filter({ hasText: "Ask for two referrals" })).toContainText(
    "Casey Cho · from Issue: Hiring pipeline is slow",
  );
});

test("an Observer sees Issues read-only", async ({ page }) => {
  await signIn(page, "Ellis Evans");
  await openPage(page, "Issues");

  await expect(rows(page)).toHaveCount(5);
  await expect(rows(page).nth(0)).toContainText("Priority 5");
  await expect(issues(page).getByRole("button", { name: "Add Issue" })).toHaveCount(0);
  await expect(issues(page).getByRole("button", { name: /^Solve/ })).toHaveCount(0);
});

test("an Issue added in one browser reaches another without a reload", async ({ browser }) => {
  const blake = await signedInBrowser(browser, "Blake Brooks", "Issues");
  const dana = await signedInBrowser(browser, "Dana Diaz", "Issues");
  await expect(dana.getByText("Live", { exact: true })).toBeVisible();

  await issues(blake).getByRole("button", { name: "Add Issue" }).click();
  const drawer = blake.getByRole("dialog", { name: "Add an Issue" });
  await drawer.getByLabel("What needs solving?").fill("Warehouse lease");
  await drawer.getByRole("button", { name: "Add Issue" }).click();

  await expect(unsolved(dana)).toContainText("Warehouse lease", { timeout: 2000 });
});
