import { prisma } from "../app/lib/prisma";
import { PHONEME_KEYBOARD, WORD_LISTS, type Difficulty } from "../app/data/phonemes";

async function main() {
  await prisma.activity.deleteMany();
  await prisma.wordPhoneme.deleteMany();
  await prisma.word.deleteMany();
  await prisma.wordList.deleteMany();
  await prisma.phonemeSymbol.deleteMany();

  const symbolToId = new Map<string, number>();
  for (const phoneme of PHONEME_KEYBOARD) {
    const created = await prisma.phonemeSymbol.create({
      data: { symbol: phoneme.symbol, hint: phoneme.hint },
    });
    symbolToId.set(phoneme.symbol, created.id);
  }

  const difficulties = Object.keys(WORD_LISTS).map(Number) as Difficulty[];

  for (const difficulty of difficulties) {
    const wordList = await prisma.wordList.create({
      data: {
        name: `${difficulty}-phoneme words`,
        difficulty,
      },
    });

    for (const entry of WORD_LISTS[difficulty]) {
      await prisma.word.create({
        data: {
          text: entry.word,
          wordListId: wordList.id,
          phonemes: {
            create: entry.phonemes.map((symbol, position) => ({
              position,
              symbol,
              phonemeSymbolId: symbolToId.get(symbol) ?? null,
            })),
          },
        },
      });
    }

    await prisma.activity.create({
      data: {
        name: `${difficulty}-phoneme Wordle`,
        type: "WORDLE",
        wordListId: wordList.id,
        hintsEnabled: true,
        guessCount: 6,
      },
    });

    await prisma.activity.create({
      data: {
        name: `${difficulty}-phoneme Word Search`,
        type: "WORD_SEARCH",
        wordListId: wordList.id,
        hintsEnabled: true,
        gridRows: 10,
        gridCols: 10,
      },
    });
  }

  const wordCount = await prisma.word.count();
  const listCount = await prisma.wordList.count();
  const activityCount = await prisma.activity.count();
  console.log(
    `Seeded ${listCount} word lists, ${wordCount} words, ${activityCount} activities.`,
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
