import { expect, test } from "@playwright/test";
import {
  activityRow,
  createActivity,
  createWordList,
  kpiNumber,
  removeQuietly,
  saveDownload,
  uniqueName,
} from "./helpers";

// The dashboard turns the stored usage data into health, alerts, figures and
// reports. These tests change the data and check the dashboard follows.

test("the dashboard shows health, key figures, charts and the report", async ({ page }) => {
  await page.goto("/dashboard");

  const health = page.locator('section[aria-labelledby="health-heading"]');
  await expect(health).toContainText("Healthy");
  await expect(health).toContainText("Database up");

  await expect(page.locator("dl > div")).toHaveCount(8);
  for (const label of [
    "Wordle activities created",
    "Word Search activities created",
    "Word lists",
    "Most-used activity type",
    "Successful generations",
    "Failed generations",
    "Average time on page",
    "Average generation time",
  ]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }

  // The chart is an image with a description, backed by a data table.
  await expect(page.getByRole("img", { name: "Generations per day" })).toBeVisible();
  await page.getByText("View the chart data as a table").click();
  await expect(page.getByRole("table", { name: /Generations per day/ }).locator("tbody tr")).toHaveCount(30);

  await expect(page.getByRole("table", { name: "Generation attempts, newest first" }).locator("tbody tr")).toHaveCount(10);
});

test("an empty word list raises an alert, and it clears when the list is removed", async ({
  request,
  page,
}) => {
  const listName = uniqueName("E2E empty list");
  const alerts = page.locator('section[aria-labelledby="alerts-heading"]');

  const list = await createWordList(request, listName, 4);
  try {
    await page.goto("/dashboard");
    await expect(alerts).toContainText("Warning");
    await expect(alerts).toContainText(`Empty word list`);
    await expect(alerts).toContainText(listName);
  } finally {
    await removeQuietly(request, `/api/wordlists/${list.id}`);
  }

  await page.getByRole("button", { name: "Refresh" }).click();
  await expect(alerts).not.toContainText(listName);
});

test("generating from a saved activity downloads a file and moves the figures", async ({ page }, testInfo) => {
  await page.goto("/dashboard");
  const successBefore = await kpiNumber(page, "Successful generations");

  const row = activityRow(page, "3-phoneme Wordle");
  await expect(row).toContainText("6 guesses");

  const download = await saveDownload(
    page,
    () => page.getByRole("button", { name: "Download 3-phoneme Wordle" }).click(),
    testInfo.outputPath("from-activity.html"),
  );
  expect(download.name).toMatch(/^wordle-.+\.html$/);
  expect(download.html).toContain("GUESS_COUNT = 6");

  await expect(page.getByText(/Generated "3-phoneme Wordle" and downloaded/)).toBeVisible();

  // The dashboard reloads itself after a generation: one more success is counted
  // and the newest row of the report is that success.
  await expect(async () => {
    expect(await kpiNumber(page, "Successful generations")).toBe(successBefore + 1);
  }).toPass();
  const newest = page
    .getByRole("table", { name: "Generation attempts, newest first" })
    .locator("tbody tr")
    .first();
  await expect(newest).toContainText("Successful");
  await expect(newest).toContainText("Wordle");
});

test("a failing activity shows a clear error, is counted as failed, and appears in the filtered report", async ({
  request,
  page,
}) => {
  const list = await createWordList(request, uniqueName("E2E failing list"), 3); // no words
  const activityName = uniqueName("E2E failing activity");
  const activity = await createActivity(request, {
    name: activityName,
    type: "WORD_SEARCH",
    wordListId: list.id,
    hintsEnabled: true,
    gridRows: 10,
    gridCols: 10,
  });

  try {
    await page.goto("/dashboard");
    const failedBefore = await kpiNumber(page, "Failed generations");

    await page.getByRole("button", { name: `Download ${activityName}` }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: `"${activityName}" could not be generated: Word list is empty` }),
    ).toBeVisible();

    await expect(async () => {
      expect(await kpiNumber(page, "Failed generations")).toBe(failedBefore + 1);
    }).toPass();

    // Filter the report to failures: the newest failure carries the reason.
    await page.getByRole("combobox", { name: "Outcome" }).selectOption("FAILURE");
    const rows = page.getByRole("table", { name: "Generation attempts, newest first" }).locator("tbody tr");
    await expect(rows.first()).toContainText("Failed");
    await expect(rows.first()).toContainText("Word list is empty");
  } finally {
    await removeQuietly(request, `/api/activities/${activity.id}`);
    await removeQuietly(request, `/api/wordlists/${list.id}`);
  }
});

test("the report can be filtered and exported as CSV", async ({ page }, testInfo) => {
  await page.goto("/dashboard");

  // Matched as comboboxes: a plain label match for "Activity type" would also
  // catch the "Generations by activity type" panel, which is labelled the same way.
  await page.getByRole("combobox", { name: "Outcome" }).selectOption("FAILURE");
  await page.getByRole("combobox", { name: "Activity type" }).selectOption("WORD_SEARCH");

  // Retry until the table has reloaded with the filters applied.
  const table = page.getByRole("table", { name: "Generation attempts, newest first" });
  await expect(async () => {
    const rows = await table.locator("tbody tr").allTextContents();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toContain("Failed");
      expect(row).toContain("Word Search");
    }
  }).toPass();

  const csv = await saveDownload(
    page,
    () => page.getByRole("link", { name: "Download CSV" }).click(),
    testInfo.outputPath("generation-report.csv"),
  );
  expect(csv.name).toBe("generation-report.csv");

  const [header, ...lines] = csv.html.trim().split(/\r?\n/);
  expect(header).toBe("id,time,activity_type,status,error_reason,duration_ms");
  expect(lines.length).toBeGreaterThan(0);
  for (const line of lines) {
    expect(line).toContain("WORD_SEARCH,FAILURE");
  }
});
