"use client";

import { useEffect, useState } from "react";
import { ACTIVITY_LABELS } from "../../lib/format";
import { downloadGeneratedActivity, requestGeneratedActivity } from "../../lib/generateApi";
import GenerateMessage, { type GenerateMessageState } from "../GenerateMessage";

type ActivityRow = {
  id: number;
  name: string;
  type: "WORDLE" | "WORD_SEARCH";
  hintsEnabled: boolean;
  guessCount: number | null;
  gridRows: number | null;
  gridCols: number | null;
  wordList: { id: number; name: string; difficulty: number };
};

type ListResult = { key: number; rows: ActivityRow[] | null; error: string | null };
type Busy = { id: number; action: "download" | "preview" } | null;
type Preview = { name: string; html: string } | null;

const buttonClass =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900 dark:focus-visible:ring-zinc-100";

function settingsSummary(row: ActivityRow): string {
  const hints = row.hintsEnabled ? "hints on" : "hints off";
  return row.type === "WORDLE"
    ? `${row.guessCount} guesses, ${hints}`
    : `${row.gridRows}×${row.gridCols} grid, ${hints}`;
}

/**
 * The activities stored in the database. Generating here uses each activity's
 * saved settings (never values typed on this page), and the attempt is logged
 * against the activity, so the stats above move when a button is pressed.
 */
export default function SavedActivities({
  refreshKey,
  onGenerated,
}: {
  refreshKey: number;
  /** Called after every attempt, successful or not, so the dashboard reloads. */
  onGenerated: () => void;
}) {
  const [result, setResult] = useState<ListResult>({ key: -1, rows: null, error: null });
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<GenerateMessageState | null>(null);
  const [preview, setPreview] = useState<Preview>(null);

  useEffect(() => {
    let isCurrent = true;
    fetch("/api/activities", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<{ data: ActivityRow[] }>;
      })
      .then(({ data }) => {
        if (isCurrent) setResult({ key: refreshKey, rows: data, error: null });
      })
      .catch(() => {
        if (isCurrent) {
          setResult({ key: refreshKey, rows: null, error: "Could not load the saved activities." });
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [refreshKey]);

  async function run(row: ActivityRow, action: "download" | "preview") {
    setBusy({ id: row.id, action });
    setMessage(null);
    try {
      if (action === "download") {
        const filename = await downloadGeneratedActivity({ activityId: row.id });
        setMessage({ kind: "success", text: `Generated "${row.name}" and downloaded ${filename}` });
      } else {
        const { html } = await requestGeneratedActivity({ activityId: row.id });
        setPreview({ name: row.name, html });
        setMessage({ kind: "success", text: `Generated "${row.name}". Preview shown below.` });
      }
    } catch (err) {
      setMessage({
        kind: "error",
        text: `"${row.name}" could not be generated: ${
          err instanceof Error ? err.message : "unknown error"
        }`,
      });
    } finally {
      setBusy(null);
      onGenerated();
    }
  }

  const rows = result.rows;

  if (result.error && !rows) {
    return (
      <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
        {result.error}
      </p>
    );
  }
  if (!rows) {
    return (
      <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
        Loading saved activities…
      </p>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No activities are saved yet. Create one from the Wordle or Word Search page.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        tabIndex={0}
        role="region"
        aria-label="Saved activities table"
        className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800"
      >
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Saved activities and their stored settings</caption>
          <thead className="bg-zinc-100 dark:bg-zinc-900">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Activity</th>
              <th scope="col" className="px-3 py-2 font-semibold">Type</th>
              <th scope="col" className="px-3 py-2 font-semibold">Word list</th>
              <th scope="col" className="px-3 py-2 font-semibold">Stored settings</th>
              <th scope="col" className="px-3 py-2 font-semibold">Generate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isBusy = busy?.id === row.id;
              return (
                <tr key={row.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <th scope="row" className="px-3 py-2 font-medium">{row.name}</th>
                  <td className="px-3 py-2">{ACTIVITY_LABELS[row.type]}</td>
                  <td className="px-3 py-2">
                    {row.wordList.name} ({row.wordList.difficulty} phonemes)
                  </td>
                  <td className="px-3 py-2">{settingsSummary(row)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => run(row, "preview")}
                        disabled={busy !== null}
                        aria-label={`Preview ${row.name}`}
                        className={buttonClass}
                      >
                        {isBusy && busy?.action === "preview" ? "Generating…" : "Preview"}
                      </button>
                      <button
                        type="button"
                        onClick={() => run(row, "download")}
                        disabled={busy !== null}
                        aria-label={`Download ${row.name}`}
                        className={buttonClass}
                      >
                        {isBusy && busy?.action === "download" ? "Generating…" : "Download"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <GenerateMessage message={message} />

      {preview && (
        <section aria-label={`Preview of ${preview.name}`} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Preview: {preview.name}
            </h3>
            <button type="button" onClick={() => setPreview(null)} className={buttonClass}>
              Close preview
            </button>
          </div>
          {/* The generated file runs its own script, so it is sandboxed without
              same-origin access: it can play the game but cannot touch this app. */}
          <iframe
            title={`Generated activity: ${preview.name}`}
            srcDoc={preview.html}
            sandbox="allow-scripts"
            className="h-[640px] w-full rounded border border-zinc-300 bg-white dark:border-zinc-700"
          />
        </section>
      )}
    </div>
  );
}
