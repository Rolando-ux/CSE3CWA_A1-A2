export const ACTIVITY_LABELS = {
  WORDLE: "Wordle",
  WORD_SEARCH: "Word Search",
} as const;

/** "45s", "2m 35s", "1h 5m" - compact durations for dashboard figures. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.round(totalSeconds);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const rest = seconds % 60;
    return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`;
  }

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes === 0 ? `${hours}h` : `${hours}h ${restMinutes}m`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-05" -> "5 Oct" (parsed by hand so timezones can't shift the day). */
export function formatDay(isoDate: string): string {
  const [, month, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

export const EVENT_LABELS: Record<string, string> = {
  ACTIVITY_CREATED: "Activity created",
  ACTIVITY_UPDATED: "Activity updated",
  ACTIVITY_DELETED: "Activity deleted",
  WORDLIST_CREATED: "Word list created",
  WORDLIST_UPDATED: "Word list updated",
  WORDLIST_DELETED: "Word list deleted",
  VALIDATION_ERROR: "Invalid data rejected",
};

/** "6 Oct, 11:42 am" - short local date and time for tables and feeds. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
