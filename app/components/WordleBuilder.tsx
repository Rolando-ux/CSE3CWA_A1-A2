"use client";

import { useState } from "react";
import { WORD_LISTS, type Difficulty } from "../data/phonemes";
import PhonemeKeyboard from "./PhonemeKeyboard";

const DIFFICULTIES: Difficulty[] = [3, 4, 5];
const MIN_GUESSES = 1;
const MAX_GUESSES = 10;
const DEFAULT_GUESSES = 6;

function createEmptyGuesses(guessCount: number, phonemeCount: number): string[][] {
  return Array.from({ length: guessCount }, () => Array(phonemeCount).fill(""));
}

export default function WordleBuilder() {
  const [difficulty, setDifficulty] = useState<Difficulty>(3);
  const [wordIndex, setWordIndex] = useState(0);
  const [showHints, setShowHints] = useState(true);
  const [guessCount, setGuessCount] = useState(DEFAULT_GUESSES);
  const [guesses, setGuesses] = useState(() =>
    createEmptyGuesses(DEFAULT_GUESSES, 3),
  );
  const [currentRow, setCurrentRow] = useState(0);
  const [currentCol, setCurrentCol] = useState(0);

  const wordList = WORD_LISTS[difficulty];
  const selectedWord = wordList[wordIndex];
  const isRowFull = currentCol === difficulty;
  const isGameOver = currentRow >= guessCount;

  function resetGrid(nextGuessCount: number, nextDifficulty: Difficulty) {
    setGuesses(createEmptyGuesses(nextGuessCount, nextDifficulty));
    setCurrentRow(0);
    setCurrentCol(0);
  }

  function handleDifficultyChange(nextDifficulty: Difficulty) {
    setDifficulty(nextDifficulty);
    setWordIndex(0);
    resetGrid(guessCount, nextDifficulty);
  }

  function handleWordChange(nextIndex: number) {
    setWordIndex(nextIndex);
    resetGrid(guessCount, difficulty);
  }

  function handleGuessCountChange(nextGuessCount: number) {
    const clamped = Math.min(MAX_GUESSES, Math.max(MIN_GUESSES, nextGuessCount));
    setGuessCount(clamped);
    resetGrid(clamped, difficulty);
  }

  function handlePhonemeSelect(symbol: string) {
    if (isGameOver || isRowFull) return;
    setGuesses((prev) => {
      const next = prev.map((row) => [...row]);
      next[currentRow][currentCol] = symbol;
      return next;
    });
    setCurrentCol((col) => col + 1);
  }

  function handleBackspace() {
    if (currentCol === 0) return;
    const prevCol = currentCol - 1;
    setGuesses((prev) => {
      const next = prev.map((row) => [...row]);
      next[currentRow][prevCol] = "";
      return next;
    });
    setCurrentCol(prevCol);
  }

  function handleEnter() {
    if (!isRowFull || isGameOver) return;
    setCurrentRow((row) => row + 1);
    setCurrentCol(0);
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
        {guesses.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2">
            {row.map((cell, colIndex) => (
              <div
                key={colIndex}
                className="flex h-12 w-12 items-center justify-center rounded-md border-2 border-zinc-300 text-lg font-semibold text-zinc-950 dark:border-zinc-700 dark:text-zinc-50"
              >
                {cell}
              </div>
            ))}
          </div>
        ))}
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {isGameOver
            ? "Out of guesses."
            : `Row ${currentRow + 1} of ${guessCount}`}
        </p>
      </section>

      <section aria-label="Phoneme keyboard" className="w-full max-w-xl">
        <PhonemeKeyboard onSelect={handlePhonemeSelect} showHints={showHints} />
        <div className="mt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={handleBackspace}
            disabled={currentCol === 0}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Backspace
          </button>
          <button
            type="button"
            onClick={handleEnter}
            disabled={!isRowFull || isGameOver}
            className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Enter
          </button>
        </div>
      </section>
    </div>
  );
}
