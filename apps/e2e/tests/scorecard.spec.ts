import { expect, test, type Page } from "@playwright/test";

import { closeBrowsers, openPage, resetData, signedInBrowser, signIn } from "./helpers";

test.beforeEach(({ request }) => resetData(request));
test.afterEach(closeBrowsers);

const scorecard = (page: Page) => page.locator("#scorecard");
const cell = (page: Page, label: RegExp) => scorecard(page).getByRole("button", { name: label });

test("the scorecard shows 13 weeks, newest first, with a status per score", async ({ page }) => {
  await signIn(page, "Casey Cho");
  await openPage(page, "Scorecard");

  const headers = scorecard(page).getByRole("columnheader");
  await expect(headers).toHaveCount(17);
  await expect(headers.nth(0)).toHaveText("Owner");
  await expect(headers.nth(1)).toHaveText("Measurable");
  await expect(headers.nth(2)).toHaveText("Trend");
  await expect(headers.nth(3)).toHaveText("Weekly goal");
  await expect(headers.nth(4)).toContainText("This week");
  await expect(headers.nth(4)).toContainText("Nov 9 – Nov 15");
  await expect(headers.nth(5)).toContainText("Last week");
  await expect(headers.nth(5)).toContainText("Nov 2 – Nov 8");
  await expect(headers.nth(16)).toContainText("Aug 17 – Aug 23");

  const deals = scorecard(page).getByRole("row", { name: /New deals closed/ });
  await expect(deals.getByRole("button", { name: "Owner: Blake Brooks" })).toBeVisible();
  await expect(deals).toContainText("At least 10");
  await expect(cell(page, /New deals closed, week of Nov 2: 8, Off track/)).toBeVisible();
  await expect(cell(page, /New deals closed, week of Nov 9: no score, Pending/)).toBeVisible();
  await expect(cell(page, /Cash on hand, week of Nov 2: no score, Off track/)).toBeVisible();
  await expect(cell(page, /Customer churn, week of Nov 2: 3%, On track/)).toBeVisible();
});

test("a score can be entered, changed and cleared inline", async ({ page }) => {
  await signIn(page, "Casey Cho");
  await openPage(page, "Scorecard");

  await cell(page, /New deals closed, week of Nov 9: no score, Pending/).click();
  const input = page.getByRole("textbox", { name: "Score for New deals closed, week of Nov 9" });
  await input.fill("lots");
  await input.press("Enter");
  await expect(input).toHaveAttribute("aria-invalid", "true");

  await input.fill("11");
  await input.press("Enter");
  await expect(cell(page, /New deals closed, week of Nov 9: 11, On track/)).toBeVisible();

  await cell(page, /New deals closed, week of Nov 9: 11, On track/).click();
  await input.fill("7");
  await input.press("Enter");
  await expect(cell(page, /New deals closed, week of Nov 9: 7, Off track/)).toBeVisible();

  await cell(page, /New deals closed, week of Nov 9: 7, Off track/).click();
  await input.press("Escape");
  await expect(cell(page, /New deals closed, week of Nov 9: 7, Off track/)).toBeVisible();

  await cell(page, /New deals closed, week of Nov 9: 7, Off track/).click();
  await input.fill("");
  await input.press("Enter");
  await expect(cell(page, /New deals closed, week of Nov 9: no score, Pending/)).toBeVisible();
});

test("a save based on a score someone else has since changed is refused", async ({ browser }) => {
  const blake = await signedInBrowser(browser, "Blake Brooks", "Scorecard");
  const dana = await signedInBrowser(browser, "Dana Diaz", "Scorecard");
  await expect(blake.getByText("Live", { exact: true })).toBeVisible();
  const label = "Score for New deals closed, week of Nov 2";

  await cell(blake, /New deals closed, week of Nov 2: 8, Off track/).click();
  const blakeInput = blake.getByRole("textbox", { name: label });
  await blakeInput.fill("9");

  await cell(dana, /New deals closed, week of Nov 2: 8, Off track/).click();
  const danaInput = dana.getByRole("textbox", { name: label });
  await danaInput.fill("12");
  await danaInput.press("Enter");
  await expect(cell(dana, /New deals closed, week of Nov 2: 12, On track/)).toBeVisible();

  await blakeInput.press("Enter");
  await expect(blake.getByText("Someone else changed this score to 12")).toBeVisible();
  await expect(cell(blake, /New deals closed, week of Nov 2: 12, On track/)).toBeVisible();
  await expect(cell(dana, /New deals closed, week of Nov 2: 12, On track/)).toBeVisible();
});

test("an Observer cannot edit scores", async ({ page }) => {
  await signIn(page, "Ellis Evans");
  await openPage(page, "Scorecard");

  await expect(scorecard(page).getByText("New deals closed", { exact: true })).toBeVisible();
  await expect(
    scorecard(page).getByRole("button", { name: /Edit score|Make it an Issue/ }),
  ).toHaveCount(0);
  await expect(
    scorecard(page).getByRole("button", { name: "Show trend for New deals closed" }),
  ).toBeVisible();
  await expect(scorecard(page).getByRole("button", { name: "New measurable" })).toHaveCount(0);
});

test("a score entered in one browser reaches another without a reload", async ({ browser }) => {
  const blake = await signedInBrowser(browser, "Blake Brooks", "Scorecard");
  const dana = await signedInBrowser(browser, "Dana Diaz", "Scorecard");
  await expect(dana.getByText("Live", { exact: true })).toBeVisible();
  await expect(cell(dana, /New deals closed, week of Nov 9: no score, Pending/)).toBeVisible();

  await cell(blake, /New deals closed, week of Nov 9: no score, Pending/).click();
  const input = blake.getByRole("textbox", { name: "Score for New deals closed, week of Nov 9" });
  await input.fill("12");
  await input.press("Enter");
  await expect(cell(dana, /New deals closed, week of Nov 9: 12, On track/)).toBeVisible({
    timeout: 2000,
  });

  await cell(blake, /New deals closed, week of Nov 9: 12, On track/).click();
  await input.fill("");
  await input.press("Enter");
  await expect(cell(dana, /New deals closed, week of Nov 9: no score, Pending/)).toBeVisible({
    timeout: 2000,
  });
});

const unsolvedIssues = (page: Page) =>
  page.getByRole("list", { name: "Unsolved Issues" }).getByRole("listitem");

test("an off-track score becomes an Issue from its flag", async ({ page }) => {
  await signIn(page, "Casey Cho");
  await openPage(page, "Scorecard");

  await scorecard(page)
    .getByRole("button", { name: "Make it an Issue: New deals closed, week of Oct 26" })
    .click();

  await expect(page.getByText("Added to Issues: New deals closed, week of Oct 26")).toBeVisible();
  await expect(
    scorecard(page).getByRole("button", {
      name: "Issue open for New deals closed, week of Oct 26",
    }),
  ).toBeVisible();

  await openPage(page, "Issues");
  await expect(unsolvedIssues(page)).toHaveCount(6);
  const created = unsolvedIssues(page).filter({ hasText: "New deals closed, week of Oct 26" });
  await expect(created).toContainText("Casey Cho");
  await expect(created).toContainText("From scorecard: New deals closed, week of Oct 26");
});

test("a score that already has an open Issue does not get a second one", async ({ page }) => {
  await signIn(page, "Casey Cho");
  await openPage(page, "Scorecard");

  await scorecard(page)
    .getByRole("button", { name: "Issue open for New deals closed, week of Nov 2" })
    .click();

  await expect(
    page.getByText("Already on the Issues list: New deals closed, week of Nov 2"),
  ).toBeVisible();
  await openPage(page, "Issues");
  await expect(unsolvedIssues(page)).toHaveCount(5);
});

test("two people flagging the same score at once create one Issue", async ({ browser }) => {
  const blake = await signedInBrowser(browser, "Blake Brooks", "Scorecard");
  const dana = await signedInBrowser(browser, "Dana Diaz", "Scorecard");
  const flag = (page: Page) =>
    scorecard(page).getByRole("button", {
      name: "Make it an Issue: Avg first response, week of Nov 2",
    });
  await expect(flag(blake)).toBeVisible();
  await expect(flag(dana)).toBeVisible();

  await Promise.all([flag(blake).click(), flag(dana).click()]);

  for (const page of [blake, dana]) {
    await openPage(page, "Issues");
    await expect(unsolvedIssues(page)).toHaveCount(6);
    await expect(
      unsolvedIssues(page).filter({ hasText: "Avg first response, week of Nov 2" }),
    ).toHaveCount(1);
  }
});

test("the owner's name shows on hover and a trend opens from the chart button", async ({
  page,
}) => {
  await signIn(page, "Casey Cho");
  await openPage(page, "Scorecard");

  await scorecard(page).getByRole("button", { name: "Owner: Dana Diaz" }).first().hover();
  await expect(page.getByRole("dialog").getByText("Dana Diaz")).toBeVisible();
  await page.mouse.move(0, 0);

  await scorecard(page).getByRole("button", { name: "Show trend for Customer churn" }).click();
  const trend = page.getByRole("dialog", { name: "Customer churn · trend" });
  await expect(trend).toContainText("Goal: at most 3%");
  await expect(trend).toContainText("Owner: Casey Cho");
  await expect(trend.getByRole("img", { name: /Customer churn, weekly values/ })).toBeVisible();
  await expect(trend.getByText("Last week", { exact: true })).toBeVisible();
});

test("a Team Member adds a measurable and everyone sees it", async ({ browser }) => {
  const casey = await signedInBrowser(browser, "Casey Cho", "Scorecard");
  const dana = await signedInBrowser(browser, "Dana Diaz", "Scorecard");
  await expect(dana.getByText("Live", { exact: true })).toBeVisible();

  await scorecard(casey).getByRole("button", { name: "New measurable" }).click();
  const dialog = casey.getByRole("dialog", { name: "New measurable" });
  await dialog.getByRole("button", { name: "Add measurable" }).click();
  await expect(dialog.getByText("Name the number you track")).toBeVisible();
  await expect(dialog.getByText("Enter a number")).toBeVisible();

  await dialog.getByLabel("What do you measure?").fill("Qualified leads");
  await dialog.getByRole("combobox", { name: "Weekly goal" }).click();
  await casey.getByRole("option", { name: "Between" }).click();
  await dialog.getByLabel("From").fill("40");
  await dialog.getByLabel("To").fill("20");
  await dialog.getByRole("button", { name: "Add measurable" }).click();
  await expect(dialog.getByText("Must not be below the lower number")).toBeVisible();

  await dialog.getByLabel("From").fill("20");
  await dialog.getByLabel("To").fill("40");
  await dialog.getByRole("button", { name: "Add measurable" }).click();
  await expect(dialog).toBeHidden();

  for (const page of [casey, dana]) {
    const row = scorecard(page).getByRole("row", { name: /Qualified leads/ });
    await expect(row).toContainText("Between 20 and 40", { timeout: 2000 });
    await expect(row.getByRole("button", { name: "Owner: Casey Cho" })).toBeVisible();
  }
  await expect(cell(casey, /Qualified leads, week of Nov 2: no score, Pending/)).toBeVisible();
});
