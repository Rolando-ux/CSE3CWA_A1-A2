"use client";

import { ACTIVITY_LABELS, formatDuration, formatPercent } from "../../lib/format";
import { FAILURE_RATE_WARNING_PCT } from "../../lib/thresholds";
import { useStats } from "../../lib/useStats";
import BarBreakdown from "./BarBreakdown";
import DailyChart from "./DailyChart";
import HealthBadge from "./HealthBadge";
import KpiCard from "./KpiCard";

function Panel({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 id={id} className="mb-3 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DashboardView() {
  const { stats, error, isLoading, refresh } = useStats();

  const refreshButton = (
    <button
      type="button"
      onClick={refresh}
      disabled={isLoading}
      className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900 dark:focus-visible:ring-zinc-100"
    >
      {isLoading ? "Loading…" : "Refresh"}
    </button>
  );

  if (!stats) {
    return (
      <div className="flex flex-col items-start gap-3">
        {error ? (
          <>
            <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
              {error}
            </p>
            {refreshButton}
          </>
        ) : (
          <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
            Loading dashboard…
          </p>
        )}
      </div>
    );
  }

  const { totals, generations, pageTime } = stats;
  const mostUsed = generations.mostUsedType
    ? ACTIVITY_LABELS[generations.mostUsedType]
    : generations.total === 0
      ? "No data"
      : "Tied";
  const failureIsHigh = generations.failureRatePct > FAILURE_RATE_WARNING_PCT;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Last updated {new Date(stats.generatedAt).toLocaleTimeString()}
        </p>
        {refreshButton}
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {error} Showing the last figures that loaded.
        </p>
      )}

      <HealthBadge health={stats.health} />

      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="mb-3 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Key figures
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Wordle activities created"
            value={totals.createdActivities.wordle}
            hint={`${totals.savedActivities.wordle} currently saved`}
          />
          <KpiCard
            label="Word Search activities created"
            value={totals.createdActivities.wordSearch}
            hint={`${totals.savedActivities.wordSearch} currently saved`}
          />
          <KpiCard
            label="Word lists"
            value={totals.wordLists}
            hint={`${totals.words} words stored`}
          />
          <KpiCard
            label="Most-used activity type"
            value={mostUsed}
            hint={`Wordle ${generations.byType.wordle} · Word Search ${generations.byType.wordSearch}`}
          />
          <KpiCard
            label="Successful generations"
            value={generations.success}
            hint={`of ${generations.total} attempts`}
          />
          <KpiCard
            label="Failed generations"
            value={generations.failure}
            tone={failureIsHigh ? "warning" : "default"}
            hint={
              failureIsHigh
                ? `${formatPercent(generations.failureRatePct)} failure rate, above the ${FAILURE_RATE_WARNING_PCT}% warning level`
                : `${formatPercent(generations.failureRatePct)} failure rate`
            }
          />
          <KpiCard
            label="Average time on page"
            value={formatDuration(pageTime.averageSeconds)}
            hint={`across ${pageTime.sessions} page visits`}
          />
          <KpiCard
            label="Average generation time"
            value={`${generations.averageDurationMs} ms`}
            hint="server time to build one file"
          />
        </dl>
      </section>

      <Panel id="daily-heading" title="Generations per day">
        <DailyChart daily={stats.daily} />
      </Panel>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Panel id="type-heading" title="Generations by activity type">
          <BarBreakdown
            items={[
              {
                label: ACTIVITY_LABELS.WORDLE,
                value: generations.byType.wordle,
                barClass: "fill-violet-700 dark:fill-violet-400",
              },
              {
                label: ACTIVITY_LABELS.WORD_SEARCH,
                value: generations.byType.wordSearch,
                barClass: "fill-sky-700 dark:fill-sky-400",
              },
            ]}
          />
        </Panel>

        <Panel id="outcome-heading" title="Successful vs failed">
          <BarBreakdown
            items={[
              {
                label: "Successful",
                value: generations.success,
                barClass: "fill-green-700 dark:fill-green-500",
              },
              {
                label: "Failed",
                value: generations.failure,
                barClass: "fill-red-700 dark:fill-red-400",
              },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
