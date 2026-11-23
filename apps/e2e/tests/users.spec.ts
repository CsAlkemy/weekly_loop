import { expect, test } from "@playwright/test";

import { resetData, signIn, signInWith } from "./helpers";

test.beforeEach(({ request }) => resetData(request));

const settingsLink = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Settings" });

test("an Admin adds a user who can then sign in to their team", async ({ page }) => {
  await signIn(page, "Avery Admin");
  await settingsLink(page).click();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Settings" }).getByRole("link", { name: "Users & roles" }),
  ).toHaveAttribute("aria-current", "page");

  await page.getByRole("button", { name: "Add user" }).click();
  const dialog = page.getByRole("dialog", { name: "Add a user" });
  await dialog.getByRole("button", { name: "Add user" }).click();
  await expect(dialog.getByText("Enter their name")).toBeVisible();

  await dialog.getByLabel("Full name").fill("Jordan Jones");
  await dialog.getByLabel("Work email").fill("jordan@acme.test");
  await dialog.getByLabel("Sales").check();
  await dialog.getByLabel("Password", { exact: true }).fill("jordan-password");
  await dialog.getByRole("button", { name: "Add user" }).click();

  const jordan = page.getByRole("list", { name: "Users" }).getByRole("listitem").filter({
    hasText: "Jordan Jones",
  });
  await expect(jordan).toContainText("Team Member");
  await expect(jordan).toContainText("Sales");

  await page.getByRole("button", { name: "Open account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await signInWith(page, "jordan@acme.test", "jordan-password");
  await expect(page.getByRole("heading", { name: "Sales" })).toBeVisible();
  await expect(settingsLink(page)).toHaveCount(0);
});

test("an Admin changes a role and the email must stay unique", async ({ page }) => {
  await signIn(page, "Avery Admin");
  await page.goto("/admin/settings");

  await page.getByRole("button", { name: "Edit Indy Ito" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit Indy Ito" });
  await dialog.getByRole("combobox", { name: "Role" }).click();
  await page.getByRole("option", { name: "Observer" }).click();
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("list", { name: "Users" }).getByRole("listitem").filter({ hasText: "Indy Ito" }),
  ).toContainText("Observer");

  await page.getByRole("button", { name: "Add user" }).click();
  const add = page.getByRole("dialog", { name: "Add a user" });
  await add.getByLabel("Full name").fill("Second Casey");
  await add.getByLabel("Work email").fill("casey@acme.test");
  await add.getByLabel("Password", { exact: true }).fill("another-password");
  await add.getByRole("button", { name: "Add user" }).click();
  await expect(add.getByText("A user with this email already exists")).toBeVisible();
});

test("people who are not Admins cannot manage users", async ({ page }) => {
  await signIn(page, "Blake Brooks");
  await expect(settingsLink(page)).toHaveCount(0);

  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin\/settings$/);
  await expect(page.getByRole("heading", { name: "Only Admins can open Settings" })).toBeVisible();
});
