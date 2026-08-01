"use client";

import { useState } from "react";
import { WORD_LISTS, type Difficulty } from "../data/phonemes";
import { evaluateGuess, type CellStatus } from "../lib/evaluateGuess";
import PhonemeKeyboard from "./PhonemeKeyboard";

const DIFFICULTIES: Difficulty[] = [3, 4, 5];
const MIN_GUESSES = 1;
const MAX_GUESSES = 10;
const DEFAULT_GUESSES = 6;
const DEFAULT_DIFFICULTY: Difficulty = 3;

type GameStatus = "playing" | "won" | "lost";

type GameState = {
  guesses: string[][];
  feedback: (CellStatus[] | null)[];
  currentRow: number;
  currentCol: number;
  gameStatus: GameStatus;
};

const CELL_STATUS_STYLES: Record<CellStatus, string> = {
  correct: "border-green-600 bg-green-600 text-white dark:border-green-500 dark:bg-green-500",
  present: "border-amber-500 bg-amber-500 text-white dark:border-amber-400 dark:bg-amber-400",
  absent: "border-zinc-400 bg-zinc-400 text-white dark:border-zinc-600 dark:bg-zinc-600",
};

function createGameState(guessCount: number, phonemeCount: number): GameState {
  return {
    guesses: Array.from({ length: guessCount }, () => Array(phonemeCount).fill("")),
    feedback: Array.from({ length: guessCount }, () => null),
    currentRow: 0,
    currentCol: 0,
    gameStatus: "playing",
  };
}

export default function WordleBuilder() {
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [wordIndex, setWordIndex] = useState(0);
  const [showHints, setShowHints] = useState(true);
  const [guessCount, setGuessCount] = useState(DEFAULT_GUESSES);
  const [game, setGame] = useState(() =>
    createGameState(DEFAULT_GUESSES, DEFAULT_DIFFICULTY),
  );

  const wordList = WORD_LISTS[difficulty];
  const selectedWord = wordList[wordIndex];
  const isPlaying = game.gameStatus === "playing";
  const isRowFull = game.currentCol === difficulty;

  function handleDifficultyChange(nextDifficulty: Difficulty) {
    setDifficulty(nextDifficulty);
    setWordIndex(0);
    setGame(createGameState(guessCount, nextDifficulty));
  }

  function handleWordChange(nextIndex: number) {
    setWordIndex(nextIndex);
    setGame(createGameState(guessCount, difficulty));
  }

  function handleGuessCountChange(nextGuessCount: number) {
    const clamped = Math.min(MAX_GUESSES, Math.max(MIN_GUESSES, nextGuessCount));
    setGuessCount(clamped);
    setGame(createGameState(clamped, difficulty));
  }

  function handlePhonemeSelect(symbol: string) {
    setGame((prev) => {
      if (prev.gameStatus !== "playing" || prev.currentCol >= difficulty) {
        return prev;
      }
      const guesses = prev.guesses.map((row) => [...row]);
      guesses[prev.currentRow][prev.currentCol] = symbol;
      return { ...prev, guesses, currentCol: prev.currentCol + 1 };
    });
  }

  function handleBackspace() {
    setGame((prev) => {
      if (prev.gameStatus !== "playing" || prev.currentCol === 0) {
        return prev;
      }
      const prevCol = prev.currentCol - 1;
      const guesses = prev.guesses.map((row) => [...row]);
      guesses[prev.currentRow][prevCol] = "";
      return { ...prev, guesses, currentCol: prevCol };
    });
  }

  function handleEnter() {
    setGame((prev) => {
      if (prev.gameStatus !== "playing" || prev.currentCol !== difficulty) {
        return prev;
      }

      const rowStatuses = evaluateGuess(
        prev.guesses[prev.currentRow],
        selectedWord.phonemes,
      );
      const feedback = [...prev.feedback];
      feedback[prev.currentRow] = rowStatuses;

      const hasWon = rowStatuses.every((status) => status === "correct");
      if (hasWon) {
        return { ...prev, feedback, gameStatus: "won" };
      }

      const isLastRow = prev.currentRow + 1 >= prev.guesses.length;
      if (isLastRow) {
        return { ...prev, feedback, gameStatus: "lost" };
      }

      return {
        ...prev,
        feedback,
        currentRow: prev.currentRow + 1,
        currentCol: 0,
      };
    });
  }

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <section
        aria-label="Activity settings"
        className="grid w-full max-w-xl grid-cols-1 gap-4 rounded-lg border border-zinc-200 p-4 text-left sm:grid-cols-2 dark:border-zinc-800"
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Difficulty (phonemes per word)
          <select
            value={difficulty}
            onChange={(e) =>
              handleDifficultyChange(Number(e.target.value) as Difficulty)
            }
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-950 dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d} phonemes
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Phoneme word
          <select
            value={wordIndex}
            onChange={(e) => handleWordChange(Number(e.target.value))}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-950 dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
          >
            {wordList.map((entry, index) => (
              <option key={entry.word} value={index}>
                {entry.word}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <legend>Show hints</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 font-normal">
              <input
                type="radio"
                name="show-hints"
                checked={showHints}
                onChange={() => setShowHints(true)}
              />
              Yes
            </label>
            <label className="flex items-center gap-2 font-normal">
              <input
                type="radio"
                name="show-hints"
                checked={!showHints}
                onChange={() => setShowHints(false)}
              />
              No
            </label>
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Number of guesses
          <input
            type="number"
            min={MIN_GUESSES}
            max={MAX_GUESSES}
            value={guessCount}
            onChange={(e) => handleGuessCountChange(Number(e.target.value))}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-950 dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
          />
        </label>
      </section>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Answer preview (teacher only): {selectedWord.word} -{" "}
        {selectedWord.phonemes.join(" ")}
      </p>

      <section aria-label="Guess grid" className="flex flex-col items-center gap-2">
        {game.guesses.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2">
            {row.map((cell, colIndex) => {
              const status = game.feedback[rowIndex]?.[colIndex];
              return (
                <div
                  key={colIndex}
                  className={`flex h-12 w-12 items-center justify-center rounded-md border-2 text-lg font-semibold transition-colors ${
                    status
                      ? CELL_STATUS_STYLES[status]
                      : "border-zinc-300 text-zinc-950 dark:border-zinc-700 dark:text-zinc-50"
                  }`}
                >
                  {cell}
                </div>
              );
            })}
          </div>
        ))}

        <p
          role="status"
          className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {game.gameStatus === "won" &&
            `Correct! "${selectedWord.word}" (${selectedWord.phonemes.join(" ")})`}
          {game.gameStatus === "lost" &&
            `Out of guesses. The word was "${selectedWord.word}" (${selectedWord.phonemes.join(" ")})`}
          {game.gameStatus === "playing" &&
            `Row ${game.currentRow + 1} of ${guessCount}`}
        </p>
      </section>

      <section aria-label="Phoneme keyboard" className="w-full max-w-xl">
        <PhonemeKeyboard onSelect={handlePhonemeSelect} showHints={showHints} />
        <div className="mt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={handleBackspace}
            disabled={!isPlaying || game.currentCol === 0}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Backspace
          </button>
          <button
            type="button"
            onClick={handleEnter}
            disabled={!isPlaying || !isRowFull}
            className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Enter
          </button>
        </div>
      </section>
    </div>
  );
}
