// Builds lighthouse/RESULTS.md from lighthouse/reports/<label>/summary.json.
//
//   node lighthouse/summarize.mjs                 compares "before" and "after"
//   node lighthouse/summarize.mjs before after    the labels to compare, in order
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [beforeLabel = "before", afterLabel = "after"] = process.argv.slice(2);

const load = (label) => {
  const file = join(here, "reports", label, "summary.json");
  if (!existsSync(file)) throw new Error(`No results for "${label}". Run: node lighthouse/run-lighthouse.mjs --label ${label}`);
  return JSON.parse(readFileSync(file, "utf8"));
};
const before = load(beforeLabel);
const after = load(afterLabel);

const find = (run, page, formFactor) => run.results.find((r) => r.page === page && r.formFactor === formFactor);
const pages = [...new Set(before.results.map((r) => r.page))];
const name = (page) => (page === "/" ? "Home (/)" : page);
const change = (a, b) => (a === b ? `${b}` : `${a} → **${b}**`);

const lines = [];
lines.push("# Lighthouse results", "");
lines.push(
  `Lighthouse ${after.lighthouse}, run on a production build served on a throwaway database, using Playwright's Chromium. ` +
    `Scores are out of 100. "${beforeLabel}" ran ${before.ranAt.slice(0, 10)}; "${afterLabel}" ran ${after.ranAt.slice(0, 10)}. ` +
    `Lighthouse scores vary slightly between runs, especially performance.`,
  "",
);

for (const category of [
  ["accessibility", "Accessibility"],
  ["performance", "Performance"],
  ["bestPractices", "Best practices"],
  ["seo", "SEO"],
]) {
  const [key, title] = category;
  lines.push(`## ${title}`, "", `| Page | Mobile (${beforeLabel} → ${afterLabel}) | Desktop (${beforeLabel} → ${afterLabel}) |`, "|---|---:|---:|");
  for (const page of pages) {
    const cell = (formFactor) => {
      const b = find(before, page, formFactor);
      const a = find(after, page, formFactor);
      return b && a ? change(b.scores[key], a.scores[key]) : "-";
    };
    lines.push(`| ${name(page)} | ${cell("mobile")} | ${cell("desktop")} |`);
  }
  lines.push("");
}

lines.push("## Layout stability (Cumulative Layout Shift, lower is better; under 0.1 is good)", "");
lines.push(`| Page | Mobile (${beforeLabel} → ${afterLabel}) | Desktop (${beforeLabel} → ${afterLabel}) |`, "|---|---:|---:|");
for (const page of pages) {
  const cell = (formFactor) => {
    const b = find(before, page, formFactor);
    const a = find(after, page, formFactor);
    return b && a ? change(b.metrics.cumulativeLayoutShift, a.metrics.cumulativeLayoutShift) : "-";
  };
  lines.push(`| ${name(page)} | ${cell("mobile")} | ${cell("desktop")} |`);
}
lines.push("");

// Optional: a run made with the accessibility fixes temporarily removed
// (node lighthouse/run-lighthouse.mjs --label a11y-before --only ...), which
// shows what those fixes were worth.
const a11yFile = join(here, "reports", "a11y-before", "summary.json");
if (existsSync(a11yFile)) {
  const a11y = JSON.parse(readFileSync(a11yFile, "utf8"));
  lines.push(
    "## What the accessibility fixes were worth",
    "",
    `These pages were also run with the accessibility fixes temporarily removed (everything else unchanged), then compared with the "${afterLabel}" run. The fixes were made after an automated axe-core scan, the same engine behind Lighthouse's accessibility score.`,
    "",
    "| Page | Mode | Accessibility without the fixes → with | Audits that failed without the fixes |",
    "|---|---|---:|---|",
  );
  for (const run of a11y.results) {
    const now = find(after, run.page, run.formFactor);
    const issues = run.failing.filter((f) => f.category === "accessibility");
    lines.push(
      `| ${name(run.page)} | ${run.formFactor} | ${change(run.scores.accessibility, now?.scores.accessibility ?? "?")} | ` +
        `${issues.length ? issues.map((f) => `${f.title} (\`${f.id}\`${f.items.length ? `: ${f.items[0]}` : ""})`).join("; ") : "none"} |`,
    );
  }
  lines.push("");
}

const failing = after.results.filter((r) => r.failing.length);
lines.push(`## Audits still failing in "${afterLabel}"`, "");
if (failing.length === 0) {
  lines.push("None.", "");
} else {
  for (const run of failing) {
    for (const f of run.failing) {
      lines.push(`- **${name(run.page)} (${run.formFactor})**: ${f.title} (\`${f.id}\`, ${f.category})${f.items.length ? ` - ${f.items.join("; ")}` : ""}`);
    }
  }
  lines.push("");
}

writeFileSync(join(here, "RESULTS.md"), lines.join("\n"), "utf8");
console.log(lines.join("\n"));
console.log("Wrote lighthouse/RESULTS.md");
