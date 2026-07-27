import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
        Phoneme Activity Builder
      </h1>
      <p className="mt-4 max-w-xl text-zinc-600 dark:text-zinc-400">
        A classroom activity builder for Speech Pathology teachers. Create
        phoneme-based Wordle and Word Search activities, preview them, and
        download a single HTML file ready to use in any web browser.
      </p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Link
          href="/wordle"
          className="rounded-md bg-zinc-950 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Build a Wordle activity
        </Link>
        <Link
          href="/word-search"
          className="rounded-md border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-950 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Build a Word Search activity
        </Link>
      </div>
    </div>
  );
}
