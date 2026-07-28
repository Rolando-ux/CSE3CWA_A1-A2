"use client";

import { useSyncExternalStore } from "react";
import { THEME_COOKIE } from "../nav-links";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggleTheme() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    document.cookie = `${THEME_COOKIE}=${next ? "dark" : "light"}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax`;
  }

  return (
    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {isDark ? "Dark Mode" : "Light Mode"}
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Toggle dark mode"
        onClick={toggleTheme}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
          isDark ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform dark:bg-black ${
            isDark ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}
