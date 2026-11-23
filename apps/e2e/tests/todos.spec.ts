import { expect, test, type Page } from "@playwright/test";

import { closeBrowsers, openPage, resetData, signedInBrowser, signIn } from "./helpers";

test.beforeEach(({ request }) => resetData(request));
test.afterEach(closeBrowsers);

const openTodos = (page: Page) => page.getByRole("list", { name: "Open To-Dos" });

test("To-Dos show the completion rate and overdue flags", async ({ page }) => {
  await signIn(page, "Casey Cho");
  await openPage(page, "To-Dos");

  const completion = page.locator("#todo-completion");
  await expect(completion).toContainText("Week of Nov 2, the last closed week.");
  await expect(completion).toContainText("90%");
  await expect(completion).toContainText("9 of 10 done · meets 90% target");
  await expect(completion).toContainText("Overdue now2");

  const overdue = openTodos(page).getByRole("listitem").filter({ hasText: "Overdue" });
  await expect(overdue).toHaveCount(2);
  await expect(overdue.first()).toContainText("Publish hiring ad");
  await expect(
    openTodos(page).getByRole("listitem").filter({ hasText: "Set payroll reminder" }),
  ).toContainText("from Issue: Payroll runs, week of Oct 26");
});

test("a To-Do can be marked done and undone", async ({ page }) => {
  await signIn(page, "Casey Cho");
  await openPage(page, "To-Dos");

  await page.getByRole("checkbox", { name: 'Mark "Publish hiring ad" done' }).click();
  await expect(openTodos(page)).not.toContainText("Publish hiring ad");

  await page.getByRole("button", { name: "Done (15)" }).click();
  const undo = page.getByRole("checkbox", { name: 'Mark "Publish hiring ad" not done' });
  await expect(undo).toBeChecked();

  await undo.click();
  await expect(openTodos(page)).toContainText("Publish hiring ad");
  await expect(page.getByRole("button", { name: "Done (14)" })).toBeVisible();
});

test("an Admin ticks a teammate's To-Do and the list says who did", async ({ page }) => {
  await signIn(page, "Avery Admin");
  await openPage(page, "To-Dos");

  await page.getByRole("checkbox", { name: 'Mark "Publish hiring ad" done' }).click();
  await page.getByRole("button", { name: "Done (15)" }).click();
  const row = page
    .getByRole("list", { name: "Done To-Dos" })
    .getByRole("listitem")
    .filter({ hasText: "Publish hiring ad" });
  await expect(row).toContainText("Casey Cho");
  await expect(row).toContainText("by Avery Admin");
});

test("ticking a To-Do due this week moves this week's figure, not the closed week", async ({
  page,
}) => {
  await signIn(page, "Blake Brooks");
  await openPage(page, "To-Dos");
  const completion = page.locator("#todo-completion");
  const thisWeek = page.getByRole("region", { name: "This week so far" });
  await expect(thisWeek).toContainText("Week of Nov 9");
  await expect(thisWeek).toContainText("0 of 3 done · 0%");

  await page.getByRole("checkbox", { name: 'Mark "Send portal beta invites" done' }).click();

  await expect(thisWeek).toContainText("1 of 3 done · 33%");
  await expect(completion).toContainText("9 of 10 done · meets 90% target");
});

test("an Observer sees To-Dos read-only", async ({ page }) => {
  await signIn(page, "Ellis Evans");
  await openPage(page, "To-Dos");

  await expect(page.getByText("read-only")).toBeVisible();
  const checkboxes = openTodos(page).getByRole("checkbox");
  await expect(checkboxes.first()).toBeDisabled();
});

test("a change in one browser reaches another without a reload", async ({ browser }) => {
  const blake = await signedInBrowser(browser, "Blake Brooks", "To-Dos");
  const dana = await signedInBrowser(browser, "Dana Diaz", "To-Dos");
  await expect(dana.getByText("Live", { exact: true })).toBeVisible();
  await expect(openTodos(dana)).toContainText("Prep Q1 planning agenda");

  await blake.getByRole("checkbox", { name: 'Mark "Prep Q1 planning agenda" done' }).click();
  await expect(openTodos(dana)).not.toContainText("Prep Q1 planning agenda", { timeout: 2000 });

  await blake.getByRole("button", { name: "Done (15)" }).click();
  await blake.getByRole("checkbox", { name: 'Mark "Prep Q1 planning agenda" not done' }).click();
  await expect(openTodos(dana)).toContainText("Prep Q1 planning agenda", { timeout: 2000 });
});
