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

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
