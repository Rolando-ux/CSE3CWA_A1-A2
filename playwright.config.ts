import { defineConfig, devices } from "@playwright/test";

// A different port from `npm run dev` (3000), so the tests never collide with
// a development server that is already running.
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // The tests share one database and some of them change it, so they run one
  // at a time, in file order.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    acceptDownloads: true,
  },

  // Playwright's own Chromium (installed under %LOCALAPPDATA%\ms-playwright),
  // not the machine's Chrome.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // 1. build a fresh throwaway database, 2. build the app, 3. serve it. The
  // production build is what runs in Docker, so it is what gets tested.
  webServer: {
    command:
      "node tests/setup/prepare-test-db.mjs && npm run build && npm run start -- -p " + PORT,
    url: `${BASE_URL}/health`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: { DATABASE_URL: "file:./test.db" },
  },
});
