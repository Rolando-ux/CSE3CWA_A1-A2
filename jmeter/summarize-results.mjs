// Turns the raw JMeter output in jmeter/results/x<users>/ into jmeter/RESULTS.md.
//
//   node jmeter/summarize-results.mjs
//
// Reads, per level: results.jtl (every request), run-info.json (settings and
// database row counts before/after) and server-metrics.csv (server CPU and
// memory sampled every 2 seconds).
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const resultsDir = join(here, "results");

// ---------- small helpers
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const percentile = (sorted, p) =>
  sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const fmt = (n, digits = 0) => Number(n).toLocaleString("en-AU", { minimumFractionDigits: digits, maximumFractionDigits: digits });

function loadSamples(file) {
  const [header, ...rows] = parseCsv(readFileSync(file, "utf8")).filter((r) => r.length > 1);
  const col = Object.fromEntries(header.map((name, i) => [name, i]));
  return rows.map((r) => ({
    time: Number(r[col.timeStamp]),
    elapsed: Number(r[col.elapsed]),
    label: r[col.label],
    code: r[col.responseCode],
    message: r[col.responseMessage],
    ok: r[col.success] === "true",
    allThreads: Number(r[col.allThreads]),
    connect: Number(r[col.Connect] || 0),
    latency: Number(r[col.Latency] || 0),
  }));
}

function loadMetrics(file) {
  if (!existsSync(file)) return [];
  const [header, ...rows] = readFileSync(file, "utf8").trim().split(/\r?\n/).map((l) => l.split(","));
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, Number(r[i])])));
}

function summariseLevel(dir) {
  const info = JSON.parse(readFileSync(join(dir, "run-info.json"), "utf8").replace(/^﻿/, ""));
  const samples = loadSamples(join(dir, "results.jtl"));
  const metrics = loadMetrics(join(dir, "server-metrics.csv"));

  const elapsed = samples.map((s) => s.elapsed).sort((a, b) => a - b);
  const failed = samples.filter((s) => !s.ok);
  const start = Math.min(...samples.map((s) => s.time));
  const end = Math.max(...samples.map((s) => s.time + s.elapsed));
  const durationSeconds = (end - start) / 1000;

  const errorKinds = {};
  for (const s of failed) {
    // "Non HTTP response code: org.apache...HttpHostConnectException" +
    // "Non HTTP response message: Connect to localhost:3100 [...] failed: Connection refused: ..."
    // read far better as "HttpHostConnectException: Connection refused".
    const code = s.code.replace(/^Non HTTP response code: .*\./, "");
    const message = s.message.replace(/^.*? failed: /, "").replace(/: no further information$/, "");
    const kind = `${code}: ${message}`.slice(0, 110);
    errorKinds[kind] = (errorKinds[kind] ?? 0) + 1;
  }

  const byLabel = {};
  for (const s of samples) (byLabel[s.label] ??= []).push(s);
  const labels = Object.entries(byLabel).map(([label, list]) => {
    const e = list.map((s) => s.elapsed).sort((a, b) => a - b);
    return {
      label,
      samples: list.length,
      errors: list.filter((s) => !s.ok).length,
      mean: mean(e),
      p95: percentile(e, 95),
      max: e[e.length - 1],
    };
  });

  const generates = samples.filter((s) => s.label.startsWith("POST /api/generate"));
  const generatesAnswered = generates.filter((s) => /^(200|4\d\d)$/.test(s.code)).length;

  return {
    level: info.level,
    info,
    samples: samples.length,
    errors: failed.length,
    errorPct: (failed.length / samples.length) * 100,
    errorKinds,
    mean: mean(elapsed),
    median: percentile(elapsed, 50),
    p90: percentile(elapsed, 90),
    p95: percentile(elapsed, 95),
    p99: percentile(elapsed, 99),
    max: elapsed[elapsed.length - 1],
    throughput: samples.length / durationSeconds,
    durationSeconds,
    peakThreads: Math.max(...samples.map((s) => s.allThreads)),
    labels,
    generates: generates.length,
    generatesAnswered,
    serverPeakCpu: Math.max(0, ...metrics.map((m) => m.server_cpu_pct_of_one_core)),
    serverPeakMemory: Math.max(0, ...metrics.map((m) => m.server_memory_mb)),
    peakConnections: Math.max(0, ...metrics.map((m) => m.connections_on_port)),
    systemPeakCpu: Math.max(0, ...metrics.map((m) => m.system_cpu_pct)),
    newGenerationLogs: info.dbAfter.generationLogs - info.dbBefore.generationLogs,
    activitiesLeft: info.dbAfter.activities - info.dbBefore.activities,
  };
}

// ---------- build the report
const levelDirs = readdirSync(resultsDir)
  .filter((name) => /^x\d+$/.test(name) && existsSync(join(resultsDir, name, "results.jtl")))
  .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

if (levelDirs.length === 0) {
  console.error("No results found in jmeter/results. Run jmeter/run-load-test.ps1 first.");
  process.exit(1);
}

const levels = levelDirs.map((name) => summariseLevel(join(resultsDir, name)));
const row = (title, cell) => `| ${title} | ${levels.map(cell).join(" | ")} |`;
const header = `| | ${levels.map((l) => `**x${fmt(l.level)}**`).join(" | ")} |\n|---|${levels.map(() => "---:").join("|")}|`;

const lines = [];
lines.push("# Load test results", "");
lines.push(
  `Generated by \`node jmeter/summarize-results.mjs\` from the raw JMeter output. Each level ran against a production build with a fresh, seeded SQLite database, on the same laptop that ran JMeter (so the load generator and the server competed for the same CPU and memory).`,
  "",
);
lines.push("## Load profile", "", header);
lines.push(row("Virtual users", (l) => fmt(l.level)));
lines.push(row("Ramp-up (s)", (l) => fmt(l.info.rampUpSeconds)));
lines.push(row("Loops per user", (l) => fmt(l.info.loops)));
lines.push(row("Think time between requests (ms)", (l) => fmt(l.info.thinkMs)));
lines.push(row("Peak concurrent users", (l) => fmt(l.peakThreads)));
lines.push(row("Requests sent", (l) => fmt(l.samples)));
lines.push(row("Test duration (s)", (l) => fmt(l.durationSeconds, 1)), "");

lines.push("## Response times and errors (all requests)", "", header);
lines.push(row("Errors", (l) => `${fmt(l.errors)} (${fmt(l.errorPct, 2)}%)`));
lines.push(row("Mean (ms)", (l) => fmt(l.mean)));
lines.push(row("Median (ms)", (l) => fmt(l.median)));
lines.push(row("90th percentile (ms)", (l) => fmt(l.p90)));
lines.push(row("95th percentile (ms)", (l) => fmt(l.p95)));
lines.push(row("99th percentile (ms)", (l) => fmt(l.p99)));
lines.push(row("Slowest (ms)", (l) => fmt(l.max)));
lines.push(row("Throughput (requests/s)", (l) => fmt(l.throughput, 1)), "");

lines.push("## Server resources (sampled every 2 s)", "", header);
lines.push(row("Peak server CPU (% of one core)", (l) => fmt(l.serverPeakCpu)));
lines.push(row("Peak server memory (MB)", (l) => fmt(l.serverPeakMemory)));
lines.push(row("Peak open connections on the port", (l) => fmt(l.peakConnections)));
lines.push(row("Peak whole-machine CPU (%)", (l) => fmt(l.systemPeakCpu)), "");

lines.push("## Data integrity under load", "", header);
lines.push(row("Generate requests sent", (l) => fmt(l.generates)));
lines.push(row("...that got an answer from the app", (l) => fmt(l.generatesAnswered)));
lines.push(row("New generation records in the database", (l) => fmt(l.newGenerationLogs)));
lines.push(row("Activities left behind (should be 0)", (l) => fmt(l.activitiesLeft)), "");

lines.push("## Slowest endpoint at each level (mean / 95th percentile, ms)", "");
const labelNames = [...new Set(levels.flatMap((l) => l.labels.map((x) => x.label)))];
lines.push(header);
for (const label of labelNames) {
  lines.push(
    row(label, (l) => {
      const x = l.labels.find((e) => e.label === label);
      return x ? `${fmt(x.mean)} / ${fmt(x.p95)}${x.errors ? ` (${fmt(x.errors)} err)` : ""}` : "-";
    }),
  );
}
lines.push("");

const withErrors = levels.filter((l) => l.errors > 0);
if (withErrors.length) {
  lines.push("## What the errors were", "");
  for (const l of withErrors) {
    lines.push(`**x${fmt(l.level)}**`, "");
    for (const [kind, n] of Object.entries(l.errorKinds).sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${fmt(n)} x ${kind}`);
    }
    lines.push("");
  }
}

writeFileSync(join(here, "RESULTS.md"), lines.join("\n"), "utf8");
console.log(lines.join("\n"));
console.log(`\nWrote ${join("jmeter", "RESULTS.md")}`);
