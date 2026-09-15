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
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
