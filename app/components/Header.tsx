"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LAST_TAB_COOKIE, NAV_LINKS, STUDENT_NUMBER } from "../nav-links";
import ThemeToggle from "./ThemeToggle";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export default function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    document.cookie = `${LAST_TAB_COOKIE}=${pathname}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax`;
  }, [pathname]);

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Student No. {STUDENT_NUMBER}
        </span>

        <div className="flex items-center gap-4">
          <ThemeToggle />

          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="primary-navigation"
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="flex flex-col items-center justify-center gap-1.5 rounded p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
          >
            <span
              className={`block h-0.5 w-6 bg-zinc-900 transition-transform dark:bg-zinc-50 ${
                isMenuOpen ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-6 bg-zinc-900 transition-opacity dark:bg-zinc-50 ${
                isMenuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`block h-0.5 w-6 bg-zinc-900 transition-transform dark:bg-zinc-50 ${
                isMenuOpen ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </div>

      <nav
        id="primary-navigation"
        aria-label="Primary"
        className={isMenuOpen ? "block" : "hidden"}
      >
        <ul className="flex flex-col border-t border-zinc-200 px-4 py-2 dark:border-zinc-800 sm:px-6">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block py-2 text-sm font-medium ${
                    isActive
                      ? "text-zinc-950 underline dark:text-zinc-50"
                      : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
