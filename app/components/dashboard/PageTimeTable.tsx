import { NAV_LINKS } from "../../nav-links";
import { formatDuration } from "../../lib/format";
import type { Stats } from "../../lib/stats";

const PAGE_NAMES = new Map(NAV_LINKS.map((link) => [link.href, link.label]));

/** Visits and average time spent, per page. */
export default function PageTimeTable({ pages }: { pages: Stats["pageTime"]["byPage"] }) {
  if (pages.length === 0) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">No page visits recorded yet.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">Visits and average time on each page</caption>
      <thead>
        <tr className="border-b border-zinc-200 dark:border-zinc-800">
          <th scope="col" className="py-2 pr-3 font-semibold">Page</th>
          <th scope="col" className="py-2 pr-3 font-semibold">Visits</th>
          <th scope="col" className="py-2 font-semibold">Average time</th>
        </tr>
      </thead>
      <tbody>
        {pages.map((page) => (
          <tr key={page.path} className="border-b border-zinc-200 last:border-0 dark:border-zinc-800">
            <th scope="row" className="py-2 pr-3 font-normal">
              {PAGE_NAMES.get(page.path) ?? page.path}
            </th>
            <td className="py-2 pr-3">{page.sessions}</td>
            <td className="py-2">{formatDuration(page.averageSeconds)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
