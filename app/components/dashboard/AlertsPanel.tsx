import type { Alert, AlertLevel } from "../../lib/stats";

// Severity is shown as an icon AND a word, never colour alone.
const LEVELS: Record<AlertLevel, { label: string; icon: string; classes: string }> = {
  error: {
    label: "Error",
    icon: "⛔",
    classes:
      "border-red-700 bg-red-50 text-red-950 dark:border-red-500 dark:bg-red-950 dark:text-red-100",
  },
  warning: {
    label: "Warning",
    icon: "⚠",
    classes:
      "border-amber-700 bg-amber-50 text-amber-950 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100",
  },
  info: {
    label: "Info",
    icon: "ℹ",
    classes:
      "border-sky-700 bg-sky-50 text-sky-950 dark:border-sky-500 dark:bg-sky-950 dark:text-sky-100",
  },
};

export default function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  return (
    <section
      aria-labelledby="alerts-heading"
      className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2
        id="alerts-heading"
        className="mb-3 text-lg font-semibold text-zinc-950 dark:text-zinc-50"
      >
        Alerts{" "}
        <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">
          ({alerts.length === 0 ? "none active" : `${alerts.length} active`})
        </span>
      </h2>

      {alerts.length === 0 ? (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          <span aria-hidden="true">✓ </span>
          Nothing needs attention: the database is reachable, the failure rate is within
          its limit, and no word lists are empty.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {alerts.map((alert) => {
            const level = LEVELS[alert.level];
            return (
              <li
                key={alert.code}
                className={`flex gap-3 rounded-md border-l-4 p-3 text-sm ${level.classes}`}
              >
                <span aria-hidden="true">{level.icon}</span>
                <p>
                  <strong className="font-semibold">{level.label}:</strong> {alert.message}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
