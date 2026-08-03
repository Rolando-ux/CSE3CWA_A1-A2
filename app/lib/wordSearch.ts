import type { PhonemeWord } from "../data/phonemes";

export type Direction = { dr: number; dc: number };

export const DIRECTIONS: Direction[] = [
  { dr: 0, dc: 1 }, // right
  { dr: 0, dc: -1 }, // left
  { dr: 1, dc: 0 }, // down
  { dr: -1, dc: 0 }, // up
  { dr: 1, dc: 1 }, // down-right
  { dr: 1, dc: -1 }, // down-left
  { dr: -1, dc: 1 }, // up-right
  { dr: -1, dc: -1 }, // up-left
];

export type Placement = {
  word: string;
  coords: { row: number; col: number }[];
};

export type WordSearchPuzzle = {
  grid: string[][];
  placements: Placement[];
  /** Words that could not be placed within maxAttempts (grid too small). */
  unplaced: string[];
};

const MAX_ATTEMPTS_PER_WORD = 500;

function canPlace(
  grid: (string | null)[][],
  phonemes: string[],
  row: number,
  col: number,
  direction: Direction,
  rows: number,
  cols: number,
): boolean {
  const endRow = row + direction.dr * (phonemes.length - 1);
  const endCol = col + direction.dc * (phonemes.length - 1);
  if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) {
    return false;
  }

  for (let i = 0; i < phonemes.length; i++) {
    const r = row + direction.dr * i;
    const c = col + direction.dc * i;
    const existing = grid[r][c];
    if (existing !== null && existing !== phonemes[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Places each word's phonemes into a rows x cols grid in a random position
 * and one of 8 directions (retrying on collision), then fills any remaining
 * empty cells with phonemes drawn from the word list itself so filler cells
 * never introduce a phoneme symbol outside the current word bank.
 */
export function generatePuzzle(
  words: PhonemeWord[],
  rows: number,
  cols: number,
): WordSearchPuzzle {
  const grid: (string | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null),
  );

  const pool = Array.from(new Set(words.flatMap((w) => w.phonemes)));

  const placements: Placement[] = [];
  const unplaced: string[] = [];

  for (const { word, phonemes } of words) {
    let placed = false;

    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_WORD && !placed; attempt++) {
      const direction =
        DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const row = Math.floor(Math.random() * rows);
      const col = Math.floor(Math.random() * cols);

      if (canPlace(grid, phonemes, row, col, direction, rows, cols)) {
        const coords = phonemes.map((phoneme, i) => {
          const r = row + direction.dr * i;
          const c = col + direction.dc * i;
          grid[r][c] = phoneme;
          return { row: r, col: c };
        });
        placements.push({ word, coords });
        placed = true;
      }
    }

    if (!placed) {
      unplaced.push(word);
    }
  }

  const filledGrid: string[][] = grid.map((row) =>
    row.map((cell) => cell ?? pool[Math.floor(Math.random() * pool.length)]),
  );

  return { grid: filledGrid, placements, unplaced };
}
