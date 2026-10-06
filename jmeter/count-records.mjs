// Prints how many rows the main tables hold, as JSON. Used by the load-test
// runner before and after each run to check that the database kept up
// (no generation records lost, and no stray activities left behind).
//
//   node jmeter/count-records.mjs [database file, default test.db]
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const db = new Database(process.argv[2] ?? "test.db", { readonly: true });
const count = (table) => db.prepare(`select count(*) c from ${table}`).get().c;

console.log(
  JSON.stringify({
    wordLists: count("WordList"),
    words: count("Word"),
    activities: count("Activity"),
    generationLogs: count("GenerationLog"),
    pageSessions: count("PageSession"),
    usageEvents: count("UsageEvent"),
  }),
);
