import { formatDuration } from "../../lib/format";
import type { HealthReport } from "../../lib/health";

/**
 * System health at a glance. State is carried by an icon and a word as well
 * as colour, so it reads correctly without relying on colour vision.
 */
export default function HealthBadge({ health }: { health: HealthReport }) {
  const isHealthy = health.status === "ok";

  return (
    <section
      aria-labelledby="health-heading"
      className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 id="health-heading" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        System health
      </h2>

      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
          isHealthy
            ? "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-300"
            : "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-300"
        }`}
      >
        <span aria-hidden="true">{isHealthy ? "●" : "▲"}</span>
        {isHealthy ? "Healthy" : "Unhealthy"}
      </span>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {isHealthy
          ? `Database up · ${health.database.latencyMs} ms response · running for ${formatDuration(health.uptimeSeconds)}`
          : "The database cannot be reached. Saving and generating will fail."}
      </p>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Health endpoint:{" "}
        <a
          href="/health"
          className="font-mono text-zinc-950 underline dark:text-zinc-50"
        >
          /health
        </a>
      </p>
    </section>
  );
}
