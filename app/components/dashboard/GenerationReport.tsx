"use client";

import { useEffect, useState } from "react";
import { ACTIVITY_LABELS, formatDateTime } from "../../lib/format";
import type { GenerationReportPage } from "../../lib/reports";

type Result = {
  key: string;
  data: GenerationReportPage | null;
  error: string | null;
};

const selectClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-black dark:text-zinc-50";
const buttonClass =
  "rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900 dark:focus-visible:ring-zinc-100";

/**
 * Every generation attempt as a filterable, paged table, with a CSV export of
 * whatever the filters currently match. `refreshKey` reloads it after the
 * dashboard's own refresh or a generation made on the page.
 */
export default function GenerationReport({ refreshKey }: { refreshKey: number }) {
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Result>({ key: "", data: null, error: null });

  const filters = new URLSearchParams();
  if (status) filters.set("status", status);
  if (type) filters.set("type", type);
  const pageQuery = new URLSearchParams(filters);
  pageQuery.set("page", String(page));
  pageQuery.set("pageSize", "10");

  const queryKey = `${pageQuery.toString()}|${refreshKey}`;
  const requestUrl = `/api/reports/generations?${pageQuery.toString()}`;
  const csvQuery = new URLSearchParams(filters);
  csvQuery.set("format", "csv");

  useEffect(() => {
    let isCurrent = true;
    fetch(requestUrl, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<GenerationReportPage>;
      })
      .then((data) => {
        if (isCurrent) setResult({ key: queryKey, data, error: null });
      })
      .catch(() => {
        if (isCurrent) {
          setResult({ key: queryKey, data: null, error: "Could not load the report." });
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [queryKey, requestUrl]);

  const isLoading = result.key !== queryKey;
  const data = result.data;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Outcome
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">All</option>
            <option value="SUCCESS">Successful</option>
            <option value="FAILURE">Failed</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Activity type
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">All</option>
            <option value="WORDLE">Wordle</option>
            <option value="WORD_SEARCH">Word Search</option>
          </select>
        </label>

        <a
          href={`/api/reports/generations?${csvQuery.toString()}`}
          download
          className={buttonClass}
        >
          Download CSV
        </a>
      </div>

      {result.error && !data ? (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {result.error}
        </p>
      ) : !data ? (
        <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
          Loading report…
        </p>
      ) : (
        <>
          <p
            role="status"
            aria-live="polite"
            className="mb-2 text-sm text-zinc-600 dark:text-zinc-400"
          >
            {isLoading
              ? "Updating…"
              : data.total === 0
                ? "No generations match these filters."
                : `${data.total} generation${data.total === 1 ? "" : "s"} found`}
          </p>

          {data.total > 0 && (
            <div
              tabIndex={0}
              role="region"
              aria-label="Generation report table"
              className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800"
            >
              <table className="w-full min-w-[560px] text-left text-sm">
                <caption className="sr-only">Generation attempts, newest first</caption>
                <thead className="bg-zinc-100 dark:bg-zinc-900">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">Time</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Activity</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Outcome</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Reason</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((row) => (
                    <tr key={row.id} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="px-3 py-2">{formatDateTime(row.createdAt)}</td>
                      <td className="px-3 py-2">{ACTIVITY_LABELS[row.activityType]}</td>
                      <td className="px-3 py-2">
                        {row.status === "SUCCESS" ? (
                          <span className="font-medium text-green-800 dark:text-green-400">
                            <span aria-hidden="true">✓ </span>Successful
                          </span>
                        ) : (
                          <span className="font-medium text-red-800 dark:text-red-400">
                            <span aria-hidden="true">✕ </span>Failed
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">{row.errorReason ?? "—"}</td>
                      <td className="px-3 py-2">{row.durationMs} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={buttonClass}
              >
                Previous
              </button>
              <span className="text-zinc-600 dark:text-zinc-400">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className={buttonClass}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
