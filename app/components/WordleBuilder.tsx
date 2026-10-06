"use client";

import { useEffect, useState } from "react";
import { evaluateGuess, type CellStatus } from "../lib/evaluateGuess";
import { downloadGeneratedActivity } from "../lib/generateApi";
import { fetchWordLists, type ApiWordList } from "../lib/wordListApi";
import GenerateMessage, { type GenerateMessageState } from "./GenerateMessage";
import PhonemeKeyboard from "./PhonemeKeyboard";

const MIN_GUESSES = 1;
const MAX_GUESSES = 10;
const DEFAULT_GUESSES = 6;

type GameStatus = "playing" | "won" | "lost";

type GameState = {
  guesses: string[][];
  feedback: (CellStatus[] | null)[];
  currentRow: number;
  currentCol: number;
  gameStatus: GameStatus;
};

// Colors chosen to meet WCAG AA contrast (>=4.5:1) for white text at any
// size, in both light and dark mode - the default Tailwind 500/600 shades
// (e.g. amber-500, green-600) fall as low as ~2:1 and fail even the 3:1
// large-text minimum.
const CELL_STATUS_STYLES: Record<CellStatus, string> = {
  correct: "border-green-700 bg-green-700 text-white",
  present: "border-amber-700 bg-amber-700 text-white",
  absent: "border-zinc-600 bg-zinc-600 text-white",
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
  const [wordLists, setWordLists] = useState<ApiWordList[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [listId, setListId] = useState<number | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [showHints, setShowHints] = useState(true);
  const [guessCount, setGuessCount] = useState(DEFAULT_GUESSES);
  const [game, setGame] = useState(() => createGameState(DEFAULT_GUESSES, 3));
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] =
    useState<GenerateMessageState | null>(null);

  useEffect(() => {
    fetchWordLists()
      .then((lists) => {
        setWordLists(lists);
        if (lists.length > 0) {
          setListId(lists[0].id);
          setGame(createGameState(DEFAULT_GUESSES, lists[0].difficulty));
        }
      })
      .catch(() => setLoadError("Could not load word lists from the server."));
  }, []);

  const selectedList = wordLists.find((l) => l.id === listId) ?? wordLists[0];
  const wordList = selectedList?.words ?? [];
  const selectedWord = wordList[wordIndex];
  const difficulty = selectedList?.difficulty ?? 0;
  const isPlaying = game.gameStatus === "playing";
  const isRowFull = game.currentCol === difficulty;

  function handleListChange(nextListId: number) {
    setListId(nextListId);
    setWordIndex(0);
    const nextList = wordLists.find((l) => l.id === nextListId);
    setGame(createGameState(guessCount, nextList?.difficulty ?? 0));
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

  async function handleDownload() {
    setIsGenerating(true);
    setGenerateMessage(null);
    try {
      const filename = await downloadGeneratedActivity({
        type: "WORDLE",
        wordListId: selectedList.id,
        word: selectedWord.word,
        guessCount,
        hintsEnabled: showHints,
      });
      setGenerateMessage({ kind: "success", text: `Downloaded ${filename}` });
    } catch (err) {
      setGenerateMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Could not generate the activity.",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  if (loadError) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
        {loadError}
      </p>
    );
  }

  if (!selectedList || !selectedWord) {
    // min-h-screen keeps the footer below the fold while loading, so it is not
    // pushed out of view (a layout shift) when the builder appears.
    return (
      <div className="min-h-screen">
        <p className="text-sm text-zinc-600 dark:text-zinc-400" role="status">
          Loading word lists…
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <section
        aria-label="Activity settings"
        className="grid w-full max-w-xl grid-cols-1 gap-4 rounded-lg border border-zinc-200 p-4 text-left sm:grid-cols-2 dark:border-zinc-800"
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Word list
          <select
            value={selectedList.id}
            onChange={(e) => handleListChange(Number(e.target.value))}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-950 dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
          >
            {wordLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name} ({list.difficulty} phonemes)
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

      <button
        type="button"
        onClick={handleDownload}
        disabled={isGenerating}
        className="rounded-md bg-zinc-950 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus-visible:ring-zinc-100"
      >
        {isGenerating ? "Generating…" : "Generate & Download HTML"}
      </button>

      <GenerateMessage message={generateMessage} />

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

      <section aria-labelledby="keyboard-heading" className="w-full max-w-xl">
        <h2 id="keyboard-heading" className="sr-only">
          Phoneme keyboard
        </h2>
        <PhonemeKeyboard onSelect={handlePhonemeSelect} showHints={showHints} />
        <div className="mt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={handleBackspace}
            disabled={!isPlaying || game.currentCol === 0}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900 dark:focus-visible:ring-zinc-100"
          >
            Backspace
          </button>
          <button
            type="button"
            onClick={handleEnter}
            disabled={!isPlaying || !isRowFull}
            className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus-visible:ring-zinc-100"
          >
            Enter
          </button>
        </div>
      </section>
    </div>
  );
}
