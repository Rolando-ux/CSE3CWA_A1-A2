"use client";

import { useState } from "react";
import { ACTIVITY_LABELS, formatDuration, formatPercent } from "../../lib/format";
import { FAILURE_RATE_WARNING_PCT } from "../../lib/thresholds";
import { useStats } from "../../lib/useStats";
import AlertsPanel from "./AlertsPanel";
import BarBreakdown from "./BarBreakdown";
import DailyChart from "./DailyChart";
import EventFeed from "./EventFeed";
import GenerationReport from "./GenerationReport";
import HealthBadge from "./HealthBadge";
import KpiCard from "./KpiCard";
import PageTimeTable from "./PageTimeTable";
import SavedActivities from "./SavedActivities";
import WordListSummary from "./WordListSummary";

function Panel({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 id={id} className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        {title}
      </h2>
      {description && (
        <p className="mb-3 mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      )}
      <div className={description ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

export default function DashboardView() {
  const { stats, error, isLoading, refresh } = useStats();
  // Bumped whenever the figures reload, so the self-fetching tables reload too.
  const [reloadCount, setReloadCount] = useState(0);

  function reload() {
    refresh();
    setReloadCount((count) => count + 1);
  }

  const refreshButton = (
    <button
      type="button"
      onClick={reload}
      disabled={isLoading}
      className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900 dark:focus-visible:ring-zinc-100"
    >
      {isLoading ? "Loading…" : "Refresh"}
    </button>
  );

  if (!stats) {
    // min-h-screen keeps the footer below the fold while loading, so the page
    // does not jump when the dashboard (thousands of pixels tall) appears.
    return (
      <div className="flex min-h-screen flex-col items-start gap-3">
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
      <AlertsPanel alerts={stats.alerts} />

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

      <Panel
        id="saved-heading"
        title="Generate from saved activities"
        description="Each activity is built from the settings stored in the database. Every attempt is logged, so the figures above update."
      >
        <SavedActivities refreshKey={reloadCount} onGenerated={reload} />
      </Panel>

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

      <Panel
        id="report-heading"
        title="Generation report"
        description="Every attempt to generate a Wordle or Word Search file, newest first. Filter it, or download what matches as a CSV."
      >
        <GenerationReport refreshKey={reloadCount} />
      </Panel>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Panel id="reasons-heading" title="Why generations failed">
          <BarBreakdown
            items={stats.failureReasons.map((reason) => ({
              label: reason.reason,
              value: reason.count,
              barClass: "fill-red-700 dark:fill-red-400",
            }))}
          />
        </Panel>

        <Panel id="pages-heading" title="Time on each page">
          <PageTimeTable pages={pageTime.byPage} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Panel id="lists-heading" title="Stored word lists">
          <WordListSummary lists={stats.wordListSummary} />
        </Panel>

        <Panel id="events-heading" title="Recent activity">
          <EventFeed events={stats.recentEvents} />
        </Panel>
      </div>
    </div>
  );
}
