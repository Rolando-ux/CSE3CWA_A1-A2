import { PHONEME_HINTS } from "../data/phonemes";
import { NAV_LINKS } from "../nav-links";
import type { Placement } from "./wordSearch";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const KNOWN_PHONEMES = new Set(Object.keys(PHONEME_HINTS));
const VALID_DIFFICULTIES = [3, 4, 5];
const VALID_ACTIVITY_TYPES = ["WORDLE", "WORD_SEARCH"];

export type WordListInput = {
  name: string;
  difficulty: number;
};

export function parseWordListInput(body: unknown): WordListInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const { name, difficulty } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    throw new ValidationError("`name` is required and must be a non-empty string.");
  }
  if (typeof difficulty !== "number" || !VALID_DIFFICULTIES.includes(difficulty)) {
    throw new ValidationError(
      `\`difficulty\` must be one of ${VALID_DIFFICULTIES.join(", ")}.`,
    );
  }

  return { name: name.trim(), difficulty };
}

export type WordInput = {
  text: string;
  phonemes: string[];
};

export function parseWordInput(body: unknown, expectedDifficulty?: number): WordInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const { text, phonemes } = body as Record<string, unknown>;

  if (typeof text !== "string" || text.trim().length === 0) {
    throw new ValidationError("`text` is required and must be a non-empty string.");
  }

  if (!Array.isArray(phonemes) || phonemes.length === 0) {
    throw new ValidationError("`phonemes` is required and must be a non-empty array.");
  }
  if (!phonemes.every((p) => typeof p === "string" && p.length > 0)) {
    throw new ValidationError("Every entry in `phonemes` must be a non-empty string.");
  }

  const unknown = phonemes.filter((p) => !KNOWN_PHONEMES.has(p));
  if (unknown.length > 0) {
    throw new ValidationError(
      `Unrecognised phoneme symbol(s): ${unknown.join(", ")}. Must be one of the phoneme keyboard symbols.`,
    );
  }

  if (expectedDifficulty !== undefined && phonemes.length !== expectedDifficulty) {
    throw new ValidationError(
      `This word list expects ${expectedDifficulty}-phoneme words, but ${phonemes.length} phoneme(s) were given.`,
    );
  }

  return { text: text.trim(), phonemes };
}

export type ActivityInput = {
  name: string;
  type: "WORDLE" | "WORD_SEARCH";
  wordListId: number;
  hintsEnabled: boolean;
  guessCount: number | null;
  gridRows: number | null;
  gridCols: number | null;
};

export function parseActivityInput(body: unknown): ActivityInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const {
    name,
    type,
    wordListId,
    hintsEnabled,
    guessCount,
    gridRows,
    gridCols,
  } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    throw new ValidationError("`name` is required and must be a non-empty string.");
  }
  if (typeof type !== "string" || !VALID_ACTIVITY_TYPES.includes(type)) {
    throw new ValidationError(`\`type\` must be one of ${VALID_ACTIVITY_TYPES.join(", ")}.`);
  }
  const activityType = type as "WORDLE" | "WORD_SEARCH";

  if (typeof wordListId !== "number" || !Number.isInteger(wordListId)) {
    throw new ValidationError("`wordListId` is required and must be an integer.");
  }

  const resolvedHints = hintsEnabled === undefined ? true : hintsEnabled;
  if (typeof resolvedHints !== "boolean") {
    throw new ValidationError("`hintsEnabled` must be a boolean.");
  }

  if (activityType === "WORDLE") {
    if (
      guessCount === undefined ||
      guessCount === null ||
      typeof guessCount !== "number" ||
      !Number.isInteger(guessCount) ||
      guessCount < 1 ||
      guessCount > 10
    ) {
      throw new ValidationError("`guessCount` is required for WORDLE and must be an integer between 1 and 10.");
    }
    return {
      name: name.trim(),
      type: activityType,
      wordListId,
      hintsEnabled: resolvedHints,
      guessCount,
      gridRows: null,
      gridCols: null,
    };
  }

  for (const [key, value] of [
    ["gridRows", gridRows],
    ["gridCols", gridCols],
  ] as const) {
    if (
      value === undefined ||
      value === null ||
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 5 ||
      value > 20
    ) {
      throw new ValidationError(`\`${key}\` is required for WORD_SEARCH and must be an integer between 5 and 20.`);
    }
  }

  return {
    name: name.trim(),
    type: activityType,
    wordListId,
    hintsEnabled: resolvedHints,
    guessCount: null,
    gridRows: gridRows as number,
    gridCols: gridCols as number,
  };
}

const MAX_PUZZLE_WORDS = 50;
const MAX_PHONEME_LENGTH = 4;

export type GenerateInput =
  | {
      type: "WORDLE";
      wordListId: number;
      hintsEnabled: boolean;
      word: string;
      guessCount: number;
    }
  | {
      type: "WORD_SEARCH";
      wordListId: number;
      hintsEnabled: boolean;
      gridRows: number;
      gridCols: number;
      /** Previewed puzzle from the builder; the server generates one if absent. */
      puzzle?: { grid: string[][]; placements: Placement[] };
    };

function requireIntegerInRange(
  value: unknown,
  key: string,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`\`${key}\` must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function parsePuzzle(raw: unknown, rows: number, cols: number) {
  if (typeof raw !== "object" || raw === null) {
    throw new ValidationError("`puzzle` must be an object with `grid` and `placements`.");
  }
  const { grid, placements } = raw as Record<string, unknown>;

  if (!Array.isArray(grid) || grid.length !== rows) {
    throw new ValidationError("`puzzle.grid` must have one row per `gridRows`.");
  }
  for (const row of grid) {
    if (
      !Array.isArray(row) ||
      row.length !== cols ||
      row.some(
        (cell) =>
          typeof cell !== "string" ||
          cell.length === 0 ||
          cell.length > MAX_PHONEME_LENGTH,
      )
    ) {
      throw new ValidationError(
        "`puzzle.grid` rows must each have `gridCols` non-empty phoneme symbols.",
      );
    }
  }

  if (!Array.isArray(placements) || placements.length > MAX_PUZZLE_WORDS) {
    throw new ValidationError("`puzzle.placements` must be an array of placed words.");
  }
  for (const placement of placements) {
    const { word, coords } = (placement ?? {}) as Record<string, unknown>;
    if (
      typeof word !== "string" ||
      !Array.isArray(coords) ||
      coords.some((c) => {
        const { row, col } = (c ?? {}) as Record<string, unknown>;
        return (
          typeof row !== "number" ||
          typeof col !== "number" ||
          !Number.isInteger(row) ||
          !Number.isInteger(col) ||
          row < 0 ||
          row >= rows ||
          col < 0 ||
          col >= cols
        );
      })
    ) {
      throw new ValidationError(
        "Each `puzzle.placements` entry needs a `word` and in-range `coords`.",
      );
    }
  }

  return { grid: grid as string[][], placements: placements as Placement[] };
}

export function parseGenerateInput(body: unknown): GenerateInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const { type, wordListId, hintsEnabled, word, guessCount, gridRows, gridCols, puzzle } =
    body as Record<string, unknown>;

  if (typeof type !== "string" || !VALID_ACTIVITY_TYPES.includes(type)) {
    throw new ValidationError(`\`type\` must be one of ${VALID_ACTIVITY_TYPES.join(", ")}.`);
  }
  if (typeof wordListId !== "number" || !Number.isInteger(wordListId) || wordListId < 1) {
    throw new ValidationError("`wordListId` is required and must be a positive integer.");
  }
  const resolvedHints = hintsEnabled === undefined ? true : hintsEnabled;
  if (typeof resolvedHints !== "boolean") {
    throw new ValidationError("`hintsEnabled` must be a boolean.");
  }

  if (type === "WORDLE") {
    if (typeof word !== "string" || word.trim().length === 0) {
      throw new ValidationError("`word` is required for WORDLE and must be a non-empty string.");
    }
    return {
      type,
      wordListId,
      hintsEnabled: resolvedHints,
      word: word.trim(),
      guessCount: requireIntegerInRange(guessCount, "guessCount", 1, 10),
    };
  }

  const rows = requireIntegerInRange(gridRows, "gridRows", 5, 20);
  const cols = requireIntegerInRange(gridCols, "gridCols", 5, 20);
  return {
    type: "WORD_SEARCH",
    wordListId,
    hintsEnabled: resolvedHints,
    gridRows: rows,
    gridCols: cols,
    puzzle: puzzle === undefined ? undefined : parsePuzzle(puzzle, rows, cols),
  };
}

// Pages that report time-on-page. Restricting to known paths stops arbitrary
// strings being written into the table by anyone who can reach the API.
const TRACKED_PATHS = new Set([...NAV_LINKS.map((link) => link.href), "/dashboard"]);

export type PageSessionInput = {
  path: string;
  durationSeconds: number;
};

export function parsePageSessionInput(body: unknown): PageSessionInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const { path, durationSeconds } = body as Record<string, unknown>;

  if (typeof path !== "string" || !TRACKED_PATHS.has(path)) {
    throw new ValidationError("`path` must be one of the application's pages.");
  }
  if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds) || durationSeconds < 0) {
    throw new ValidationError("`durationSeconds` must be a non-negative number.");
  }

  return { path, durationSeconds: Math.round(durationSeconds) };
}

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    throw new ValidationError("Invalid id in URL.");
  }
  return id;
}
