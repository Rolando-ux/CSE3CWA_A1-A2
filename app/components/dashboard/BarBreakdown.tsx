import { formatPercent } from "../../lib/format";

export type BreakdownItem = {
  label: string;
  value: number;
  /** Tailwind fill classes for the bar, including the dark-mode variant. */
  barClass: string;
};

/**
 * Horizontal proportion bars. The numbers and percentages are real text; the
 * SVG bar only reinforces them, so it is hidden from assistive technology.
 */
export default function BarBreakdown({ items }: { items: BreakdownItem[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">No data yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => {
        const share = (item.value / total) * 100;
        return (
          <li key={item.label}>
            <div className="mb-1 flex items-baseline justify-between gap-4 text-sm">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{item.label}</span>
              <span className="text-zinc-600 dark:text-zinc-400">
                {item.value} ({formatPercent(share)})
              </span>
            </div>
            <svg
              viewBox="0 0 100 6"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="h-2.5 w-full"
            >
              <rect width={100} height={6} rx={1} className="fill-zinc-200 dark:fill-zinc-800" />
              <rect width={share} height={6} rx={1} className={item.barClass} />
            </svg>
          </li>
        );
      })}
    </ul>
  );
}
