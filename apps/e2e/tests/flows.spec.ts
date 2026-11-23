import { expect, test, type Page } from "@playwright/test";

import { closeBrowsers, resetData, signedInBrowser, turnOnTestForms } from "./helpers";

test.beforeEach(async ({ request }) => {
  await resetData(request);
  await turnOnTestForms(request);
});
test.afterEach(closeBrowsers);

const openTodos = (page: Page) => page.getByRole("list", { name: "Open To-Dos" });
const live = (page: Page) => expect(page.getByText("Live", { exact: true })).toBeVisible();

test("a To-Do added for a teammate reaches them live, and an Observer sees it read-only", async ({
  browser,
}) => {
  const avery = await signedInBrowser(browser, "Avery Admin", "To-Dos");
  const dana = await signedInBrowser(browser, "Dana Diaz", "To-Dos");
  const ellis = await signedInBrowser(browser, "Ellis Evans", "To-Dos");
  await Promise.all([live(dana), live(ellis)]);
  await expect(ellis.getByRole("button", { name: "Add To-Do" })).toHaveCount(0);
  await expect(dana.getByRole("button", { name: "Add To-Do" })).toHaveCount(0);

  await avery.locator("#todos").getByRole("button", { name: "Add To-Do" }).click();
  const drawer = avery.getByRole("dialog", { name: "Add a To-Do" });
  await drawer.getByLabel("What needs doing?").fill("Book the offsite venue");
  await drawer.getByRole("combobox", { name: "Owner", exact: true }).click();
  await avery.getByRole("option", { name: "Dana Diaz" }).click();
  await drawer.getByRole("button", { name: "Add To-Do" }).click();
  await expect(drawer).toBeHidden();

  const forDana = openTodos(dana)
    .getByRole("listitem")
    .filter({ hasText: "Book the offsite venue" });
  await expect(forDana).toContainText("Dana Diaz", { timeout: 2000 });
  await expect(forDana).toContainText("Due Nov 18");
  const forEllis = openTodos(ellis)
    .getByRole("listitem")
    .filter({ hasText: "Book the offsite venue" });
  await expect(forEllis.getByRole("checkbox")).toBeDisabled({ timeout: 2000 });

  await forDana.getByRole("checkbox", { name: 'Mark "Book the offsite venue" done' }).click();
  await expect(openTodos(avery)).not.toContainText("Book the offsite venue", { timeout: 2000 });
  await expect(openTodos(ellis)).not.toContainText("Book the offsite venue", { timeout: 2000 });
});

test("a Rock's progress and status move for everyone as Milestones are ticked", async ({
  browser,
}) => {
  const avery = await signedInBrowser(browser, "Avery Admin", "Rocks");
  const ellis = await signedInBrowser(browser, "Ellis Evans", "Rocks");
  await live(ellis);
  await expect(ellis.getByRole("button", { name: "Add Rock" })).toHaveCount(0);

  await avery.getByRole("button", { name: "Add Rock" }).click();
  const drawer = avery.getByRole("dialog", { name: "Add a Rock" });
  await drawer.getByLabel("Quarterly goal").fill("Open the Austin office");
  await drawer.getByRole("combobox", { name: "Owner", exact: true }).click();
  await avery.getByRole("option", { name: "Dana Diaz" }).click();
  await drawer.getByLabel("Milestone 1", { exact: true }).fill("Lease signed");
  await drawer.getByLabel("Due date of Milestone 1").fill("2026-11-10");
  await drawer.getByRole("button", { name: "Add a Milestone" }).click();
  await drawer.getByLabel("Milestone 2", { exact: true }).fill("Team hired");
  await drawer.getByLabel("Due date of Milestone 2").fill("2026-12-15");
  await drawer.getByRole("button", { name: "Add Rock" }).click();
  await expect(drawer).toBeHidden();

  const rockFor = (page: Page) => page.getByRole("button", { name: /^Open the Austin office/ });
  await expect(rockFor(ellis)).toContainText("Off track", { timeout: 2000 });
  await expect(rockFor(ellis)).toContainText("0%");
  await expect(rockFor(ellis)).toContainText("Dana Diaz");

  await rockFor(avery).click();
  await avery.getByRole("checkbox", { name: 'Mark "Lease signed" done' }).click();
  await expect(rockFor(ellis)).toContainText("On track", { timeout: 2000 });
  await expect(rockFor(ellis)).toContainText("50%");

  await rockFor(ellis).click();
  await expect(ellis.getByText("Lease signed")).toBeVisible();
  await expect(ellis.getByRole("checkbox")).toHaveCount(0);
});

test("a Measurable added by an Admin appears live for an Observer", async ({ browser }) => {
  const avery = await signedInBrowser(browser, "Avery Admin", "Scorecard");
  const ellis = await signedInBrowser(browser, "Ellis Evans", "Scorecard");
  await live(ellis);

  await avery.locator("#scorecard").getByRole("button", { name: "New measurable" }).click();
  const dialog = avery.getByRole("dialog", { name: "New measurable" });
  await dialog.getByLabel("What do you measure?").fill("Demo calls booked");
  await dialog.getByLabel("Number", { exact: true }).fill("12");
  await dialog.getByRole("button", { name: "Add measurable" }).click();

  const row = ellis.locator("#scorecard").getByRole("row", { name: /Demo calls booked/ });
  await expect(row).toContainText("At least 12", { timeout: 2000 });
  await expect(row.getByRole("button", { name: "Owner: Avery Admin" })).toBeVisible();
  await expect(row.getByRole("button", { name: /Edit score/ })).toHaveCount(0);
});
