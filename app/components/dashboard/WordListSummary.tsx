import type { Stats } from "../../lib/stats";

/** What is stored: each word list, its difficulty and how much uses it. */
export default function WordListSummary({ lists }: { lists: Stats["wordListSummary"] }) {
  if (lists.length === 0) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">No word lists stored yet.</p>;
  }

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Stored word lists table"
      className="overflow-x-auto"
    >
      <table className="w-full min-w-[420px] text-left text-sm">
        <caption className="sr-only">Stored word lists</caption>
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th scope="col" className="py-2 pr-3 font-semibold">Word list</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Phonemes per word</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Words</th>
            <th scope="col" className="py-2 font-semibold">Activities</th>
          </tr>
        </thead>
        <tbody>
          {lists.map((list) => (
            <tr key={list.id} className="border-b border-zinc-200 last:border-0 dark:border-zinc-800">
              <th scope="row" className="py-2 pr-3 font-normal">{list.name}</th>
              <td className="py-2 pr-3">{list.difficulty}</td>
              <td className="py-2 pr-3">
                {list.words === 0 ? (
                  <span className="font-medium text-amber-800 dark:text-amber-300">
                    <span aria-hidden="true">⚠ </span>0 (empty)
                  </span>
                ) : (
                  list.words
                )}
              </td>
              <td className="py-2">{list.activities}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
