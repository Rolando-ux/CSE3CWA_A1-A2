import { PHONEME_HINTS } from "../data/phonemes";

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

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    throw new ValidationError("Invalid id in URL.");
  }
  return id;
}
