"use client";

import { useCallback, useEffect, useState } from "react";
import { generatePuzzle, type WordSearchPuzzle } from "../lib/wordSearch";
import { downloadGeneratedActivity } from "../lib/generateApi";
import { fetchWordLists, type ApiWordList } from "../lib/wordListApi";
import GenerateMessage, { type GenerateMessageState } from "./GenerateMessage";
import PhonemeKeyboard from "./PhonemeKeyboard";
import WordSearchGrid from "./WordSearchGrid";

const WORD_BANK_SIZE = 5;
const MIN_GRID_SIZE = 6;
const MAX_GRID_SIZE = 20;
const DEFAULT_GRID_SIZE = 10;

function clampGridSize(value: number): number {
  return Math.min(MAX_GRID_SIZE, Math.max(MIN_GRID_SIZE, value));
}

export default function WordSearchBuilder() {
  const [wordLists, setWordLists] = useState<ApiWordList[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [listId, setListId] = useState<number | null>(null);
  const [showHints, setShowHints] = useState(true);
  const [rows, setRows] = useState(DEFAULT_GRID_SIZE);
  const [cols, setCols] = useState(DEFAULT_GRID_SIZE);
  const [puzzle, setPuzzle] = useState<WordSearchPuzzle | null>(null);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] =
    useState<GenerateMessageState | null>(null);

  useEffect(() => {
    fetchWordLists()
      .then((lists) => {
        setWordLists(lists);
        if (lists.length > 0) setListId(lists[0].id);
      })
      .catch(() => setLoadError("Could not load word lists from the server."));
  }, []);

  const selectedList = wordLists.find((l) => l.id === listId) ?? wordLists[0];
  const wordBank = (selectedList?.words ?? []).slice(0, WORD_BANK_SIZE);

  function handleGenerate() {
    setPuzzle(generatePuzzle(wordBank, rows, cols));
    setFoundWords(new Set());
    setGenerateMessage(null);
  }

  async function handleDownload() {
    if (!puzzle) return;
    setIsGenerating(true);
    setGenerateMessage(null);
    try {
      // The previewed puzzle is sent so the file matches what the teacher
      // sees; the server re-checks it against the stored words.
      const filename = await downloadGeneratedActivity({
        type: "WORD_SEARCH",
        wordListId: selectedList.id,
        hintsEnabled: showHints,
        gridRows: rows,
        gridCols: cols,
        puzzle: { grid: puzzle.grid, placements: puzzle.placements },
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

  const handleWordFound = useCallback((word: string) => {
    setFoundWords((prev) => new Set(prev).add(word));
  }, []);

  const placedWords = puzzle?.placements.map((p) => p.word) ?? [];
  const allFound =
    placedWords.length > 0 && placedWords.every((w) => foundWords.has(w));

  if (loadError) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
        {loadError}
      </p>
    );
  }

  if (!selectedList) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400" role="status">
        Loading word lists…
      </p>
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
            onChange={(e) => {
              setListId(Number(e.target.value));
              setPuzzle(null);
              setFoundWords(new Set());
              setGenerateMessage(null);
            }}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-950 dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
          >
            {wordLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name} ({list.difficulty} phonemes)
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
          Grid rows
          <input
            type="number"
            min={MIN_GRID_SIZE}
            max={MAX_GRID_SIZE}
            value={rows}
            onChange={(e) => setRows(clampGridSize(Number(e.target.value)))}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-950 dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Grid columns
          <input
            type="number"
            min={MIN_GRID_SIZE}
            max={MAX_GRID_SIZE}
            value={cols}
            onChange={(e) => setCols(clampGridSize(Number(e.target.value)))}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-950 dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
          />
        </label>
      </section>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          className="rounded-md bg-zinc-950 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus-visible:ring-zinc-100"
        >
          Generate Puzzle
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!puzzle || isGenerating}
          className="rounded-md border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-950 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900 dark:focus-visible:ring-zinc-100"
        >
          {isGenerating ? "Generating…" : "Download HTML"}
        </button>
      </div>

      <GenerateMessage message={generateMessage} />

      <section
        aria-label="Word bank"
        className="w-full max-w-xl rounded-lg border border-zinc-200 p-4 text-left dark:border-zinc-800"
      >
        <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Word bank ({wordBank.length} words)
        </h2>
        <ul className="flex flex-col gap-1">
          {wordBank.map((entry) => {
            const isFound = foundWords.has(entry.word);
            return (
              <li
                key={entry.word}
                className={`text-sm ${
                  isFound
                    ? "text-zinc-400 line-through dark:text-zinc-600"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {entry.word} - {entry.phonemes.join(" ")}
              </li>
            );
          })}
        </ul>
        {puzzle && puzzle.unplaced.length > 0 && (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            Could not fit: {puzzle.unplaced.join(", ")}. Try a larger grid.
          </p>
        )}
      </section>

      <section
        aria-label="Word search preview"
        className="flex w-full max-w-xl flex-col items-center gap-2"
      >
        {puzzle ? (
          <>
            <WordSearchGrid
              grid={puzzle.grid}
              placements={puzzle.placements}
              foundWords={foundWords}
              onWordFound={handleWordFound}
            />
            <p role="status" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {allFound
                ? "All words found!"
                : `${foundWords.size} of ${placedWords.length} words found`}
            </p>
          </>
        ) : (
          <div className="flex h-64 w-full items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Click &quot;Generate Puzzle&quot; to create a {rows}x{cols} puzzle
          </div>
        )}
      </section>

      <section aria-labelledby="keyboard-heading" className="w-full max-w-xl">
        <h2 id="keyboard-heading" className="sr-only">
          Phoneme keyboard
        </h2>
        <PhonemeKeyboard showHints={showHints} />
      </section>
    </div>
  );
}
