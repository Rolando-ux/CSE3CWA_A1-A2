// Builds a fresh, throwaway SQLite database (test.db) for the end-to-end and
// load tests, so they never touch the development database (dev.db).
//
// Run by Playwright's webServer command before the app starts, and usable
// directly: `node tests/setup/prepare-test-db.mjs`.
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? "file:./test.db";
const env = { ...process.env, DATABASE_URL };

// Start from nothing so every run begins from identical seed data.
const dbFile = DATABASE_URL.replace(/^file:/, "");
for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  rmSync(`${dbFile}${suffix}`, { force: true });
}

const run = (command) => execSync(command, { stdio: "inherit", env });

console.log(`[test-db] Preparing ${DATABASE_URL}`);
run("npx prisma generate");
run("npx prisma migrate deploy");
run("npm run db:seed");
run("npm run db:seed-usage");
console.log("[test-db] Ready");
