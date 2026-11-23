import { expect, test, type Page } from "@playwright/test";

import { closeBrowsers, openPage, resetData, signedInBrowser, signIn } from "./helpers";

test.beforeEach(({ request }) => resetData(request));
test.afterEach(closeBrowsers);

const unsolved = (page: Page) => page.getByRole("list", { name: "Unsolved Issues" });

test("an overdue To-Do becomes one Issue, and a teammate sees it live", async ({ browser }) => {
  const blake = await signedInBrowser(browser, "Blake Brooks", "To-Dos");
  const casey = await signedInBrowser(browser, "Casey Cho", "Issues");
  await expect(casey.getByText("Live", { exact: true })).toBeVisible();

  await blake.getByRole("button", { name: 'Make "Publish hiring ad" an Issue' }).click();
  const row = blake
    .getByRole("list", { name: "Open To-Dos" })
    .getByRole("listitem")
    .filter({ hasText: "Publish hiring ad" });
  await expect(row.getByText("On the Issues list")).toBeVisible();
  await expect(
    blake.getByRole("button", { name: 'Make "Publish hiring ad" an Issue' }),
  ).toHaveCount(0);

  const issue = unsolved(casey)
    .getByRole("listitem")
    .filter({ hasText: "Overdue To-Do: Publish hiring ad" });
  await expect(issue).toBeVisible({ timeout: 2000 });
  await expect(issue).toContainText("From To-Do: Publish hiring ad");
});

test("an off-track Rock becomes an Issue; on-track Rocks offer no button", async ({ page }) => {
  await signIn(page, "Casey Cho");
  await openPage(page, "Rocks");

  await expect(page.getByRole("button", { name: 'Make "ERP migration" an Issue' })).toHaveCount(0);
  await page.getByRole("button", { name: 'Make "Refresh brand" an Issue' }).click();
  await expect(page.getByText("On the Issues list")).toBeVisible();

  await openPage(page, "Issues");
  await expect(
    unsolved(page).getByRole("listitem").filter({ hasText: "Off-track Rock: Refresh brand" }),
  ).toContainText("From Rock: Refresh brand");
});

test("an Observer cannot make Issues from To-Dos or Rocks", async ({ page }) => {
  await signIn(page, "Ellis Evans");
  await openPage(page, "To-Dos");
  await expect(page.getByRole("button", { name: /an Issue$/ })).toHaveCount(0);
  await openPage(page, "Rocks");
  await expect(page.getByRole("button", { name: /an Issue$/ })).toHaveCount(0);
});

test("the Overview shows who changed what", async ({ browser }) => {
  const blake = await signedInBrowser(browser, "Blake Brooks", "To-Dos");
  const dana = await signedInBrowser(browser, "Dana Diaz");
  await expect(dana.getByText("Live", { exact: true })).toBeVisible();
  const activity = dana.getByRole("list", { name: "Recent activity" });

  await blake.getByRole("checkbox", { name: 'Mark "Publish hiring ad" done' }).click();
  await expect(activity.getByRole("listitem").first()).toContainText(
    "Blake Brooks marked Publish hiring ad done",
    { timeout: 2000 },
  );
});
