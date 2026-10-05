import type { GenerateInput } from "./validation";

/** What the builders send; the server fills in the rest from the database. */
export type GenerateRequest = GenerateInput;

function filenameFromHeader(header: string | null, fallback: string): string {
  const match = header?.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Asks the server to generate an activity and saves the returned HTML file.
 * Resolves with the saved filename; rejects with a teacher-readable message
 * when the server refuses (invalid data, empty list, grid too small, ...).
 */
export async function downloadGeneratedActivity(
  request: GenerateRequest,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : "The server could not generate this activity.",
    );
  }

  const filename = filenameFromHeader(
    res.headers.get("Content-Disposition"),
    request.type === "WORDLE" ? "wordle.html" : "word-search.html",
  );
  saveBlob(await res.blob(), filename);
  return filename;
}
