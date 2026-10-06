import type { ActivityGenerateInput, GenerateInput } from "./validation";

/** Either explicit settings (the builders) or a saved activity's id. */
export type GenerateRequest = GenerateInput | ActivityGenerateInput;

export type GeneratedFile = {
  html: string;
  filename: string;
};

function filenameFromHeader(header: string | null, fallback: string): string {
  const match = header?.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

function saveFile(html: string, filename: string) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Asks the server to generate an activity and returns the HTML. Rejects with
 * a teacher-readable message when the server refuses (invalid data, empty
 * list, grid too small, ...).
 */
export async function requestGeneratedActivity(
  request: GenerateRequest,
): Promise<GeneratedFile> {
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

  const fallback =
    "type" in request && request.type === "WORDLE" ? "wordle.html" : "activity.html";
  return {
    html: await res.text(),
    filename: filenameFromHeader(res.headers.get("Content-Disposition"), fallback),
  };
}

/** Generates an activity and saves it as a download. Resolves with the filename. */
export async function downloadGeneratedActivity(
  request: GenerateRequest,
): Promise<string> {
  const { html, filename } = await requestGeneratedActivity(request);
  saveFile(html, filename);
  return filename;
}
