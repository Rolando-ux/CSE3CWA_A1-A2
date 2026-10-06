import { EVENT_LABELS, formatDateTime } from "../../lib/format";
import type { Stats } from "../../lib/stats";

/** The latest builder actions: creations, edits, deletions and rejected input. */
export default function EventFeed({ events }: { events: Stats["recentEvents"] }) {
  if (events.length === 0) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">No activity recorded yet.</p>;
  }

  return (
    <ol className="flex flex-col divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
      {events.map((event) => {
        const isRejection = event.type === "VALIDATION_ERROR";
        return (
          <li key={event.id} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span
                className={`font-medium ${
                  isRejection
                    ? "text-amber-800 dark:text-amber-300"
                    : "text-zinc-950 dark:text-zinc-50"
                }`}
              >
                {isRejection && <span aria-hidden="true">⚠ </span>}
                {EVENT_LABELS[event.type] ?? event.type}
              </span>
              <time dateTime={event.createdAt} className="text-zinc-600 dark:text-zinc-400">
                {formatDateTime(event.createdAt)}
              </time>
            </div>
            {event.detail && <p className="text-zinc-600 dark:text-zinc-400">{event.detail}</p>}
          </li>
        );
      })}
    </ol>
  );
}
