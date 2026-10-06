// Runs Lighthouse on every page, in mobile and desktop mode, against a
// production build served on a throwaway database.
//
//   node lighthouse/run-lighthouse.mjs --label before
//   node lighthouse/run-lighthouse.mjs --label after --only /dashboard
//
// Output: lighthouse/reports/<label>/<page>-<mobile|desktop>.report.{html,json}
// and a summary.json with the scores and failing audits. The big report files
// are git-ignored; node lighthouse/summarize.mjs builds lighthouse/RESULTS.md.
//
// Uses Playwright's own Chromium (not the machine's Chrome). Windows only,
// because of how that browser is located and how the server is stopped.
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LIGHTHOUSE_VERSION = "13.5.0"; // pinned so runs are comparable
const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const PAGES = ["/", "/wordle", "/word-search", "/dashboard", "/about", "/settings"];
const FORM_FACTORS = ["mobile", "desktop"];

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const label = option("label", "run");
const only = option("only", null); // one page or a comma-separated list
const wanted = only ? only.split(",") : PAGES;
const pages = PAGES.filter((p) => wanted.includes(p));
if (pages.length === 0) throw new Error(`Unknown page ${only}. Choose from ${PAGES.join(", ")}`);

const outDir = join(here, "reports", label);

function findChromium() {
  const base = join(process.env.LOCALAPPDATA ?? "", "ms-playwright");
  if (!existsSync(base)) throw new Error("Playwright's Chromium is not installed (npx playwright install chromium)");
  const folder = readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
  const exe = join(base, folder ?? "", "chrome-win64", "chrome.exe");
  if (!existsSync(exe)) throw new Error(`Chromium not found at ${exe}`);
  return exe;
}

function stopServer() {
  execFileSync("powershell", [
    "-NoProfile",
    "-Command",
    // "; exit 0": with nothing listening, PowerShell would otherwise exit non-zero.
    `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; exit 0`,
  ]);
}

async function waitForServer() {
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch(`${BASE}/health`)).status === 200) return;
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Server did not start");
}

const slug = (page) => (page === "/" ? "home" : page.slice(1));

function summarise(reportFile, page, formFactor) {
  const report = JSON.parse(readFileSync(reportFile, "utf8"));
  const score = (id) => Math.round((report.categories[id]?.score ?? 0) * 100);

  const failing = [];
  for (const [category, data] of Object.entries(report.categories)) {
    if (category === "performance") continue; // judged by its metrics below
    for (const ref of data.auditRefs) {
      const audit = report.audits[ref.id];
      if (audit.scoreDisplayMode !== "binary" || audit.score === null || audit.score >= 1) continue;
      failing.push({
        category,
        id: audit.id,
        title: audit.title,
        items: (audit.details?.items ?? [])
          .slice(0, 4)
          .map((item) => item.node?.selector ?? item.node?.snippet ?? item.source?.url ?? item.url ?? "")
          .filter(Boolean),
      });
    }
  }

  const metric = (id) => report.audits[id]?.numericValue ?? null;
  return {
    page,
    formFactor,
    scores: {
      performance: score("performance"),
      accessibility: score("accessibility"),
      bestPractices: score("best-practices"),
      seo: score("seo"),
    },
    metrics: {
      firstContentfulPaintMs: Math.round(metric("first-contentful-paint")),
      largestContentfulPaintMs: Math.round(metric("largest-contentful-paint")),
      totalBlockingTimeMs: Math.round(metric("total-blocking-time")),
      cumulativeLayoutShift: Number((metric("cumulative-layout-shift") ?? 0).toFixed(3)),
    },
    failing,
  };
}

// ---------- run
const chrome = findChromium();
console.log(`[lighthouse] Chromium: ${chrome}`);
console.log(`[lighthouse] Label: ${label} | pages: ${pages.join(" ")} | ${FORM_FACTORS.join(" + ")}`);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

stopServer();
const env = { ...process.env, DATABASE_URL: "file:./test.db" };
execFileSync("node", ["tests/setup/prepare-test-db.mjs"], { cwd: root, env, stdio: "ignore" });

console.log("[lighthouse] Building the production app...");
execFileSync("npm", ["run", "build"], { cwd: root, env, stdio: "ignore", shell: true });

const server = spawn(`npm run start -- -p ${PORT}`, { cwd: root, env, stdio: "ignore", shell: true, windowsHide: true });
server.unref();

const results = [];
try {
  await waitForServer();
  console.log("[lighthouse] Server up\n");

  for (const page of pages) {
    for (const formFactor of FORM_FACTORS) {
      const base = join(outDir, `${slug(page)}-${formFactor}`);
      const preset = formFactor === "desktop" ? "--preset=desktop" : "";
      const command =
        `npx --yes lighthouse@${LIGHTHOUSE_VERSION} "${BASE}${page}" --chrome-path="${chrome}" ` +
        `--chrome-flags="--headless=new" --output=json --output=html --output-path="${base}" --quiet ${preset}`;

      const started = Date.now();
      const run = spawnSync(command, { cwd: root, shell: true, encoding: "utf8" });
      const reportFile = `${base}.report.json`;
      if (!existsSync(reportFile)) {
        console.error(`FAILED ${page} (${formFactor})\n${run.stderr || run.stdout}`);
        process.exitCode = 1;
        continue;
      }
      const summary = summarise(reportFile, page, formFactor);
      results.push(summary);
      const s = summary.scores;
      console.log(
        `${page.padEnd(14)} ${formFactor.padEnd(8)} performance ${String(s.performance).padStart(3)}  accessibility ${String(s.accessibility).padStart(3)}  best-practices ${String(s.bestPractices).padStart(3)}  seo ${String(s.seo).padStart(3)}  ` +
          `(${Math.round((Date.now() - started) / 1000)}s)` +
          (summary.failing.length ? `  failing: ${summary.failing.map((f) => f.id).join(", ")}` : ""),
      );
    }
  }
} finally {
  stopServer();
}

writeFileSync(join(outDir, "summary.json"), JSON.stringify({ label, lighthouse: LIGHTHOUSE_VERSION, ranAt: new Date().toISOString(), results }, null, 2));
console.log(`\n[lighthouse] Saved ${results.length} reports to lighthouse/reports/${label}/`);
