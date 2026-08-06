import WordleBuilder from "../components/WordleBuilder";

export default function WordlePage() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
        Wordle
      </h1>
      <p className="mt-4 max-w-xl text-zinc-600 dark:text-zinc-400">
        Configure a phoneme-based word below, then preview it as a playable
        guessing game.
      </p>

      <div className="mt-8 w-full">
        <WordleBuilder />
      </div>
    </div>
  );
}
