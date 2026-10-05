import { prisma } from "../app/lib/prisma";

async function main() {
  const wordLists = await prisma.wordList.findMany({
    include: {
      words: {
        include: { phonemes: { orderBy: { position: "asc" } } },
      },
      activities: true,
    },
    orderBy: { difficulty: "asc" },
  });

  for (const list of wordLists) {
    console.log(`\n=== ${list.name} (difficulty ${list.difficulty}) ===`);
    console.log(`${list.words.length} words, ${list.activities.length} activities`);
    console.log(
      "Activities:",
      list.activities.map((a) => `${a.name} [${a.type}]`).join(", "),
    );
    console.log("Sample words:");
    for (const word of list.words.slice(0, 5)) {
      const phonemeStr = word.phonemes.map((p) => p.symbol).join(" / ");
      console.log(`  ${word.text.padEnd(10)} -> ${phonemeStr}`);
    }
  }

  const phonemeSymbolCount = await prisma.phonemeSymbol.count();
  console.log(`\nPhoneme keyboard symbols stored: ${phonemeSymbolCount}`);

  await printUsageSummary();
}

async function printUsageSummary() {
  console.log("\n=== Usage summary ===");

  const [total, success, failure] = await Promise.all([
    prisma.generationLog.count(),
    prisma.generationLog.count({ where: { status: "SUCCESS" } }),
    prisma.generationLog.count({ where: { status: "FAILURE" } }),
  ]);
  const failureRate = total === 0 ? 0 : (failure / total) * 100;
  console.log(
    `Generations: ${total} total, ${success} successful, ${failure} failed (${failureRate.toFixed(1)}% failure rate)`,
  );

  const byType = await prisma.generationLog.groupBy({
    by: ["activityType"],
    _count: { _all: true },
    orderBy: { _count: { activityType: "desc" } },
  });
  console.log("Generations by activity type:");
  for (const row of byType) {
    console.log(`  ${row.activityType.padEnd(12)} ${row._count._all}`);
  }
  console.log(`Most-used activity type: ${byType[0]?.activityType ?? "n/a"}`);

  const failureReasons = await prisma.generationLog.groupBy({
    by: ["errorReason"],
    where: { status: "FAILURE" },
    _count: { _all: true },
    orderBy: { _count: { errorReason: "desc" } },
  });
  console.log("Failure reasons:");
  for (const row of failureReasons) {
    console.log(`  ${String(row.errorReason).padEnd(48)} ${row._count._all}`);
  }

  const sessions = await prisma.pageSession.aggregate({
    _avg: { durationSeconds: true },
    _count: { _all: true },
  });
  console.log(
    `Page sessions: ${sessions._count._all}, average time on page ${(sessions._avg.durationSeconds ?? 0).toFixed(1)}s`,
  );

  const created = await prisma.usageEvent.groupBy({
    by: ["type"],
    _count: { _all: true },
  });
  console.log("Usage events by type:");
  for (const row of created) {
    console.log(`  ${row.type.padEnd(18)} ${row._count._all}`);
  }

  const [wordleCount, wordSearchCount] = await Promise.all([
    prisma.activity.count({ where: { type: "WORDLE" } }),
    prisma.activity.count({ where: { type: "WORD_SEARCH" } }),
  ]);
  console.log(
    `Saved activities: ${wordleCount} Wordle, ${wordSearchCount} Word Search`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
