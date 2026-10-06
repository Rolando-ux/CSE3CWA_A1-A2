import { PHONEME_KEYBOARD, type PhonemeWord } from "../data/phonemes";
import { generateWordleHtml } from "./generateWordleHtml";
import { generateWordSearchHtml } from "./generateWordSearchHtml";
import { prisma } from "./prisma";
import type { ActivityGenerateInput, GenerateInput } from "./validation";
import { generatePuzzle, type Placement } from "./wordSearch";

// Number of words from the chosen list that go into a Word Search.
export const WORD_BANK_SIZE = 5;

// Failure reasons are shared with the dashboard, which groups by this text.
export const FAILURE_REASONS = {
  EMPTY_LIST: "Word list is empty",
  NO_PHONEMES: "Word has no phoneme data",
  GRID_TOO_SMALL: "Word does not fit in grid - try a bigger grid",
} as const;

/** A generation attempt that failed for a reason the teacher can fix. */
export class GenerationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

export type GeneratedActivity = {
  html: string;
  filename: string;
};

async function loadWords(wordListId: number): Promise<PhonemeWord[]> {
  const list = await prisma.wordList.findUnique({
    where: { id: wordListId },
    include: {
      words: {
        orderBy: { id: "asc" },
        include: { phonemes: { orderBy: { position: "asc" } } },
      },
    },
  });

  if (!list) {
    throw new GenerationError("Word list not found.", 404);
  }
  if (list.words.length === 0) {
    throw new GenerationError(FAILURE_REASONS.EMPTY_LIST, 422);
  }

  return list.words.map((w) => ({
    word: w.text,
    phonemes: w.phonemes.map((p) => p.symbol),
  }));
}

function safeFilenamePart(text: string, fallback: string): string {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return cleaned || fallback;
}

function buildWordle(
  input: Extract<GenerateInput, { type: "WORDLE" }>,
  words: PhonemeWord[],
): GeneratedActivity {
  const entry =
    input.word === undefined
      ? words[Math.floor(Math.random() * words.length)]
      : words.find((w) => w.word === input.word);
  if (!entry) {
    throw new GenerationError(`"${input.word}" is not in that word list.`, 422);
  }
  if (entry.phonemes.length === 0) {
    throw new GenerationError(FAILURE_REASONS.NO_PHONEMES, 422);
  }

  return {
    html: generateWordleHtml({
      word: entry.word,
      phonemes: entry.phonemes,
      guessCount: input.guessCount,
      showHints: input.hintsEnabled,
      keyboard: PHONEME_KEYBOARD,
    }),
    filename: `wordle-${safeFilenamePart(entry.word, "activity")}.html`,
  };
}

/**
 * Checks a puzzle sent by the builder against the database words, so a
 * tampered or stale preview can never produce a file that doesn't match the
 * stored word list.
 */
function checkPuzzle(
  grid: string[][],
  placements: Placement[],
  words: PhonemeWord[],
): void {
  for (const placement of placements) {
    const entry = words.find((w) => w.word === placement.word);
    if (
      !entry ||
      placement.coords.length !== entry.phonemes.length ||
      placement.coords.some(
        (c, i) => grid[c.row][c.col] !== entry.phonemes[i],
      )
    ) {
      throw new GenerationError(
        `Puzzle does not match the stored word "${placement.word}".`,
        422,
      );
    }
  }
}

function buildWordSearch(
  input: Extract<GenerateInput, { type: "WORD_SEARCH" }>,
  words: PhonemeWord[],
): GeneratedActivity {
  const bank = words.slice(0, WORD_BANK_SIZE);
  if (bank.some((w) => w.phonemes.length === 0)) {
    throw new GenerationError(FAILURE_REASONS.NO_PHONEMES, 422);
  }

  let grid: string[][];
  let placements: Placement[];

  if (input.puzzle) {
    ({ grid, placements } = input.puzzle);
    checkPuzzle(grid, placements, words);
  } else {
    const puzzle = generatePuzzle(bank, input.gridRows, input.gridCols);
    grid = puzzle.grid;
    placements = puzzle.placements;
  }

  if (placements.length < bank.length) {
    throw new GenerationError(FAILURE_REASONS.GRID_TOO_SMALL, 422);
  }

  return {
    html: generateWordSearchHtml({
      grid,
      placements,
      showHints: input.hintsEnabled,
      keyboard: PHONEME_KEYBOARD,
    }),
    filename: "word-search.html",
  };
}

/**
 * Turns a saved Activity into a generation request using its stored settings,
 * so the output is driven by the database rather than values from the page.
 */
export async function inputFromActivity(
  request: ActivityGenerateInput,
): Promise<{ input: GenerateInput; activityId: number }> {
  const activity = await prisma.activity.findUnique({
    where: { id: request.activityId },
  });
  if (!activity) {
    throw new GenerationError("Activity not found.", 404);
  }

  if (activity.type === "WORDLE") {
    return {
      activityId: activity.id,
      input: {
        type: "WORDLE",
        wordListId: activity.wordListId,
        hintsEnabled: activity.hintsEnabled,
        word: request.word,
        guessCount: activity.guessCount ?? 6,
      },
    };
  }

  return {
    activityId: activity.id,
    input: {
      type: "WORD_SEARCH",
      wordListId: activity.wordListId,
      hintsEnabled: activity.hintsEnabled,
      gridRows: activity.gridRows ?? 10,
      gridCols: activity.gridCols ?? 10,
    },
  };
}

/** Builds the downloadable HTML for a validated request, or throws. */
export async function generateActivity(
  input: GenerateInput,
): Promise<GeneratedActivity> {
  const words = await loadWords(input.wordListId);
  return input.type === "WORDLE"
    ? buildWordle(input, words)
    : buildWordSearch(input, words);
}
