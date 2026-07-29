"use client";

import { useId, useState } from "react";
import { CONSONANTS, VOWELS, type Phoneme } from "../data/phonemes";

type PhonemeKeyboardProps = {
  /** Called with the phoneme symbol when a key is pressed/clicked. */
  onSelect?: (symbol: string) => void;
};

function PhonemeKey({
  phoneme,
  onSelect,
}: {
  phoneme: Phoneme;
  onSelect?: (symbol: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      <button
        type="button"
        onClick={onSelect ? () => onSelect(phoneme.symbol) : undefined}
        aria-label={`${phoneme.symbol}, ${phoneme.hint}`}
        aria-describedby={tooltipId}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-300 text-sm font-medium text-zinc-950 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900 dark:focus-visible:ring-zinc-100"
      >
        {phoneme.symbol}
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-950 px-2 py-1 text-xs text-white transition-opacity dark:bg-zinc-50 dark:text-zinc-950 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {phoneme.hint}
      </span>
    </span>
  );
}

export default function PhonemeKeyboard({ onSelect }: PhonemeKeyboardProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Consonants
        </h3>
        <div className="flex flex-wrap gap-2">
          {CONSONANTS.map((phoneme) => (
            <PhonemeKey
              key={phoneme.symbol}
              phoneme={phoneme}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Vowels
        </h3>
        <div className="flex flex-wrap gap-2">
          {VOWELS.map((phoneme) => (
            <PhonemeKey
              key={phoneme.symbol}
              phoneme={phoneme}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
