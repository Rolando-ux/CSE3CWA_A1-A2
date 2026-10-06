export type KpiTone = "default" | "warning";

type KpiCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  /** "warning" adds a visible border and a text prefix, never colour alone. */
  tone?: KpiTone;
};

/** One headline figure. Rendered as a <dt>/<dd> pair inside a <dl>. */
export default function KpiCard({ label, value, hint, tone = "default" }: KpiCardProps) {
  const isWarning = tone === "warning";

  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border p-4 ${
        isWarning
          ? "border-amber-600 bg-amber-50 dark:border-amber-500 dark:bg-amber-950"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</dt>
      <dd className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">{value}</dd>
      {hint && (
        <dd
          className={`text-sm ${
            isWarning
              ? "font-medium text-amber-900 dark:text-amber-300"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          {isWarning && <span aria-hidden="true">⚠ </span>}
          {hint}
        </dd>
      )}
    </div>
  );
}
