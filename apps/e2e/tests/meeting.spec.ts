import { expect, test, type Page } from "@playwright/test";

import { closeBrowsers, resetData, signedInBrowser, signIn } from "./helpers";

test.beforeEach(({ request }) => resetData(request));
test.afterEach(closeBrowsers);

const agendaStep = (page: Page) =>
  page.getByRole("list", { name: "Agenda" }).locator('[aria-current="step"]');

async function openMeetingPage(page: Page) {
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: /Level 10 Meeting/ })
    .click();
  await expect(page.getByRole("heading", { name: "Level 10 Meeting" })).toBeVisible();
}

test("the facilitator advances the agenda and a second browser follows", async ({ browser }) => {
  const blake = await signedInBrowser(browser, "Blake Brooks");
  const dana = await signedInBrowser(browser, "Dana Diaz");
  await expect(dana.getByText("Live", { exact: true })).toBeVisible();

  await openMeetingPage(blake);
  await blake.getByRole("button", { name: "Start meeting" }).click();
  await expect(agendaStep(blake)).toContainText("Scorecard");
  await expect(blake.getByText("You are facilitating")).toBeVisible();
  await expect(blake.getByRole("timer")).toBeVisible();

  await expect(dana.getByText("Level 10 Meeting in progress")).toBeVisible({ timeout: 2000 });
  await dana.getByRole("link", { name: "Join meeting" }).click();
  await expect(agendaStep(dana)).toContainText("Scorecard");
  await expect(dana.getByText("Blake Brooks is facilitating")).toBeVisible();
  await expect(dana.getByRole("button", { name: /^Next:/ })).toHaveCount(0);
  await expect(dana.locator("#scorecard")).toBeVisible();
  for (const page of [blake, dana]) {
    const attendees = page.getByRole("list", { name: "Attendees" });
    await expect(attendees).toContainText("Blake Brooks", { timeout: 2000 });
    await expect(attendees).toContainText("Dana Diaz", { timeout: 2000 });
  }

  await blake.getByRole("button", { name: "Next: IDS" }).click();
  await expect(agendaStep(blake)).toContainText("IDS");
  await expect(agendaStep(dana)).toContainText("IDS", { timeout: 2000 });
  await expect(dana.locator("#issues")).toBeVisible();

  await dana.reload();
  await expect(agendaStep(dana)).toContainText("IDS");
  await blake.reload();
  await expect(agendaStep(blake)).toContainText("IDS");
  await expect(blake.getByText("You are facilitating")).toBeVisible();

  await dana.getByRole("button", { name: 'Add a To-Do for "Hiring pipeline is slow"' }).click();
  const todoDialog = dana.getByRole("dialog", { name: "Add To-Dos" });
  await todoDialog.getByLabel("To-Do 1", { exact: true }).fill("Post the job ad");
  await todoDialog.getByRole("button", { name: "Add To-Do" }).click();
  await expect(todoDialog).toBeHidden();

  await dana.getByRole("button", { name: 'Solve "Support coverage on weekends"' }).click();
  const solveDialog = dana.getByRole("dialog", { name: "Solve Issue" });
  await solveDialog.getByLabel("How was it resolved?").fill("Hired a weekend agent.");
  await solveDialog.getByRole("button", { name: "Solve Issue" }).click();
  await expect(solveDialog).toBeHidden();
  await expect(blake.getByRole("list", { name: "Unsolved Issues" })).not.toContainText(
    "Support coverage on weekends",
    { timeout: 2000 },
  );

  await blake.getByRole("button", { name: "Next: Conclude" }).click();
  await expect(agendaStep(dana)).toContainText("Conclude", { timeout: 2000 });
  for (const page of [blake, dana]) {
    await expect(page.getByRole("list", { name: "New To-Dos" })).toContainText("Post the job ad");
  }

  await blake.getByRole("radio", { name: "8", exact: true }).click();
  await dana.getByRole("radio", { name: "9", exact: true }).click();
  for (const page of [blake, dana]) {
    const ratings = page.getByRole("list", { name: "Ratings" });
    await expect(ratings.getByRole("listitem").filter({ hasText: "Blake Brooks" })).toContainText(
      "8",
      { timeout: 2000 },
    );
    await expect(ratings.getByRole("listitem").filter({ hasText: "Dana Diaz" })).toContainText(
      "9",
      { timeout: 2000 },
    );
    await expect(page.getByText("8.5")).toBeVisible();
  }
  await dana.getByRole("radio", { name: "10", exact: true }).click();
  await expect(blake.getByText("9.0")).toBeVisible({ timeout: 2000 });

  await blake.getByRole("button", { name: "End meeting" }).click();
  await blake
    .getByRole("dialog", { name: "End the meeting for everyone?" })
    .getByRole("button", { name: "End meeting" })
    .click();

  for (const page of [blake, dana]) {
    const summary = page.getByRole("region", { name: "Meeting summary" });
    await expect(summary).toBeVisible({ timeout: 2000 });
    await expect(summary).toContainText("9.0");
    await expect(summary).toContainText("from 2 ratings");
    await expect(summary).toContainText("Week of Nov 2, the last closed week.");
    await expect(summary.getByRole("list", { name: "Issues solved" })).toContainText(
      "Hired a weekend agent.",
    );
    await expect(summary.getByRole("list", { name: "To-Dos created" })).toContainText(
      "Post the job ad",
    );
    await expect(summary.getByRole("list", { name: "Attendees" })).toContainText("Dana Diaz");
  }
});

test("an overrun section shows as over time and does not advance", async ({ page }) => {
  await signIn(page, "Blake Brooks");
  await openMeetingPage(page);
  await page.getByRole("button", { name: "Start meeting" }).click();
  await expect(page.getByRole("timer")).toContainText("left");

  await page.request.post("/api/testing/clock/advance", { data: { seconds: 390 } });
  await page.reload();

  await expect(page.getByRole("timer")).toContainText("Over time by 1:3");
  await expect(agendaStep(page)).toContainText("Scorecard");
  await expect(page.getByRole("button", { name: "Next: IDS" })).toBeVisible();
});

test("an Observer can join but not start, advance or rate", async ({ browser }) => {
  const ellis = await signedInBrowser(browser, "Ellis Evans");
  await openMeetingPage(ellis);
  await expect(ellis.getByText("No meeting in progress")).toBeVisible();
  await expect(ellis.getByRole("button", { name: "Start meeting" })).toHaveCount(0);

  const blake = await signedInBrowser(browser, "Blake Brooks");
  await openMeetingPage(blake);
  await blake.getByRole("button", { name: "Start meeting" }).click();

  await expect(agendaStep(ellis)).toContainText("Scorecard", { timeout: 2000 });
  await expect(blake.getByRole("list", { name: "Attendees" })).toContainText("Ellis Evans", {
    timeout: 2000,
  });
  await expect(ellis.getByRole("button", { name: /^Next:/ })).toHaveCount(0);

  await blake.getByRole("button", { name: "Next: IDS" }).click();
  await blake.getByRole("button", { name: "Next: Conclude" }).click();
  await expect(ellis.getByText("Observers do not rate.")).toBeVisible({ timeout: 2000 });
  await expect(ellis.getByRole("radio")).toHaveCount(0);
});

test("the last meeting's summary can be opened from the meeting page", async ({ page }) => {
  await signIn(page, "Casey Cho");
  await openMeetingPage(page);

  await page.getByRole("link", { name: "View the last meeting's summary" }).click();

  const summary = page.getByRole("region", { name: "Meeting summary" });
  await expect(summary).toContainText("8.3");
  await expect(summary).toContainText("from 4 ratings");
  await expect(summary.getByRole("list", { name: "Issues solved" })).toContainText(
    "Payroll runs, week of Oct 26",
  );
  await expect(summary.getByRole("list", { name: "To-Dos created" })).toContainText(
    "Set payroll reminder",
  );
});
