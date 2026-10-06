import { expect, test } from "@playwright/test";

// A quick check that the app is up and every page renders, before the longer
// user and builder tests run.

// The About page embeds the walkthrough video, which is git-ignored (it is a
// large binary submitted separately), so it is legitimately missing in a fresh
// checkout. Every other broken request is a real failure.
const OPTIONAL_FILES = ["/about-video.mp4"];

test("the health endpoint reports a healthy database", async ({ request }) => {
  for (const path of ["/health", "/api/health"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.database.status).toBe("up");
    expect(body.records.wordLists).toBeGreaterThan(0);
  }
});

test("every page loads with its heading, no broken requests and no script errors", async ({
  page,
}) => {
  const problems: string[] = [];

  page.on("pageerror", (error) => problems.push(`script error: ${error.message}`));
  page.on("console", (message) => {
    // "Failed to load resource" is the browser's note about a bad request; those
    // are checked precisely through the response listener below.
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) {
      problems.push(`console error: ${message.text()}`);
    }
  });
  page.on("response", (response) => {
    const { pathname } = new URL(response.url());
    if (response.status() >= 400 && !OPTIONAL_FILES.includes(pathname)) {
      problems.push(`${response.status()} for ${pathname}`);
    }
  });

  const pages = [
    { path: "/", heading: "Phoneme Activity Builder" },
    { path: "/wordle", heading: "Wordle" },
    { path: "/word-search", heading: "Word Search" },
    { path: "/dashboard", heading: "Dashboard" },
    { path: "/about", heading: "About" },
    { path: "/settings", heading: "Settings" },
  ];

  for (const { path, heading } of pages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }

  expect(problems).toEqual([]);
});
