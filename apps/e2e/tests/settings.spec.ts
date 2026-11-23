import { expect, test, type Page } from "@playwright/test";

import { openPage, resetData, signIn, turnOnTestForms } from "./helpers";

test.beforeEach(({ request }) => resetData(request));

const nav = (page: Page) => page.getByRole("navigation", { name: "Primary" });

async function openSettings(page: Page) {
  await nav(page).getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Settings" })
    .getByRole("link", { name: "Testing tools" })
    .click();
  await expect(page).toHaveURL(/\/admin\/settings\/testing$/);
}

test("an Admin turns the test forms on and off for everyone", async ({ page }) => {
  await signIn(page, "Avery Admin");
  await openPage(page, "To-Dos");
  await expect(page.getByRole("button", { name: "Add To-Do" })).toHaveCount(0);

  await openSettings(page);
  const testForms = page.getByRole("switch", { name: "Turn on all test forms" });
  await expect(testForms).toHaveAttribute("aria-checked", "false");
  await testForms.click();
  await expect(testForms).toHaveAttribute("aria-checked", "true");

  await openPage(page, "To-Dos");
  await expect(page.getByRole("button", { name: "Add To-Do" })).toBeVisible();
  await openPage(page, "Rocks");
  await expect(page.getByRole("button", { name: "Add Rock" })).toBeVisible();
  await expect(page.getByText("Testing", { exact: true })).toHaveCount(0);

  await openSettings(page);
  await testForms.click();
  await expect(testForms).toHaveAttribute("aria-checked", "false");
  await openPage(page, "Rocks");
  await expect(page.getByRole("button", { name: "Add Rock" })).toHaveCount(0);
});

test("reset to seed data removes what was added and keeps the switch", async ({
  page,
  request,
}) => {
  await turnOnTestForms(request);
  const added = await request.post("/api/teams/team_lead/todos", {
    data: { title: "Book the offsite venue", ownerId: "u3" },
  });
  expect(added.status()).toBe(201);

  await signIn(page, "Avery Admin");
  await openPage(page, "To-Dos");
  await expect(page.getByText("Book the offsite venue")).toBeVisible();

  await openSettings(page);
  await page.getByRole("button", { name: "Reset to seed data" }).click();
  const dialog = page.getByRole("dialog", { name: "Reset all data?" });
  await dialog.getByRole("button", { name: "Reset everything" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("switch", { name: "Turn on all test forms" })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  await openPage(page, "To-Dos");
  await expect(page.getByRole("button", { name: "Add To-Do" })).toBeVisible();
  await expect(page.getByText("Book the offsite venue")).toHaveCount(0);
});

test("only Admins see Settings", async ({ page }) => {
  await signIn(page, "Blake Brooks");
  await expect(nav(page).getByRole("link", { name: "Settings" })).toHaveCount(0);
  await page.goto("/admin/settings/testing");
  await expect(page.getByRole("heading", { name: "Only Admins can open Settings" })).toBeVisible();
});
