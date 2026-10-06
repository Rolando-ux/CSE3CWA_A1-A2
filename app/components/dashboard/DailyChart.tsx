import { useId } from "react";
import { formatDay } from "../../lib/format";
import type { DailyPoint } from "../../lib/stats";

const WIDTH = 560;
const HEIGHT = 220;
const MARGIN = { top: 12, right: 12, bottom: 28, left: 36 };
const TICK_COUNT = 4;
const LABEL_EVERY = 5;

/**
 * Stacked bars: generations per day, split into successful and failed.
 * The SVG carries a title and description, and the same figures are
 * available as a table, so the chart is not the only way to read the data.
 */
export default function DailyChart({ daily }: { daily: DailyPoint[] }) {
  const titleId = useId();
  const descId = useId();

  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const peak = daily.reduce((best, d) => (d.success + d.failure > best.success + best.failure ? d : best), daily[0]);
  const periodTotal = daily.reduce((sum, d) => sum + d.success + d.failure, 0);
  const periodFailures = daily.reduce((sum, d) => sum + d.failure, 0);

  // Round the axis up to a multiple of TICK_COUNT so tick labels are whole numbers.
  const highest = Math.max(1, ...daily.map((d) => d.success + d.failure));
  const axisMax = Math.ceil(highest / TICK_COUNT) * TICK_COUNT;
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => (axisMax / TICK_COUNT) * i);

  const slot = innerWidth / daily.length;
  const barWidth = slot * 0.7;
  const scale = (value: number) => (value / axisMax) * innerHeight;

  const description =
    `${periodTotal} generations over the last ${daily.length} days, ${periodFailures} of them failed. ` +
    `The busiest day was ${formatDay(peak.date)} with ${peak.success + peak.failure}.`;

  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-700 dark:text-zinc-300">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm bg-green-700 dark:bg-green-500" />
          Successful
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm bg-red-700 dark:bg-red-400" />
          Failed
        </li>
      </ul>

      <div
        tabIndex={0}
        role="region"
        aria-label="Generations per day chart, scrollable"
        className="overflow-x-auto"
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          className="min-w-[480px] w-full"
        >
          <title id={titleId}>Generations per day</title>
          <desc id={descId}>{description}</desc>

          <g transform={`translate(${MARGIN.left} ${MARGIN.top})`}>
            {ticks.map((tick) => {
              const y = innerHeight - scale(tick);
              return (
                <g key={tick}>
                  <line
                    x1={0}
                    x2={innerWidth}
                    y1={y}
                    y2={y}
                    className="stroke-zinc-200 dark:stroke-zinc-800"
                  />
                  <text
                    x={-6}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="fill-zinc-600 text-[10px] dark:fill-zinc-400"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {daily.map((day, index) => {
              const x = index * slot + (slot - barWidth) / 2;
              const successHeight = scale(day.success);
              const failureHeight = scale(day.failure);
              const showLabel = index % LABEL_EVERY === 0 || index === daily.length - 1;

              return (
                <g key={day.date}>
                  <title>{`${formatDay(day.date)}: ${day.success} successful, ${day.failure} failed`}</title>
                  <rect
                    x={x}
                    y={innerHeight - successHeight}
                    width={barWidth}
                    height={successHeight}
                    className="fill-green-700 dark:fill-green-500"
                  />
                  <rect
                    x={x}
                    y={innerHeight - successHeight - failureHeight}
                    width={barWidth}
                    height={failureHeight}
                    className="fill-red-700 dark:fill-red-400"
                  />
                  {showLabel && (
                    <text
                      x={x + barWidth / 2}
                      y={innerHeight + 16}
                      textAnchor="middle"
                      className="fill-zinc-600 text-[10px] dark:fill-zinc-400"
                    >
                      {formatDay(day.date)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300">
          View the chart data as a table
        </summary>
        <div
          tabIndex={0}
          role="region"
          aria-label="Generations per day table"
          className="mt-2 max-h-64 overflow-auto rounded border border-zinc-200 dark:border-zinc-800"
        >
          <table className="w-full text-left">
            <caption className="sr-only">Generations per day, successful and failed</caption>
            <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Day</th>
                <th scope="col" className="px-3 py-2 font-semibold">Successful</th>
                <th scope="col" className="px-3 py-2 font-semibold">Failed</th>
                <th scope="col" className="px-3 py-2 font-semibold">Wordle</th>
                <th scope="col" className="px-3 py-2 font-semibold">Word Search</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((day) => (
                <tr key={day.date} className="border-t border-zinc-200 dark:border-zinc-800">
                  <th scope="row" className="px-3 py-1.5 font-normal">{formatDay(day.date)}</th>
                  <td className="px-3 py-1.5">{day.success}</td>
                  <td className="px-3 py-1.5">{day.failure}</td>
                  <td className="px-3 py-1.5">{day.wordle}</td>
                  <td className="px-3 py-1.5">{day.wordSearch}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
