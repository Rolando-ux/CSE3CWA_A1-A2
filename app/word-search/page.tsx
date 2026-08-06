import WordSearchBuilder from "../components/WordSearchBuilder";

export default function WordSearchPage() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
        Word Search
      </h1>
      <p className="mt-4 max-w-xl text-zinc-600 dark:text-zinc-400">
        Configure a phoneme word bank below, then preview it as a word
        search puzzle.
      </p>

      <div className="mt-8 w-full">
        <WordSearchBuilder />
      </div>
    </div>
  );
}
