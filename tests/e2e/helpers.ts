import { expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/** A name that is unique per run, so tests never collide with seeded or earlier data. */
export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/** The on-screen keyboard button for one phoneme in a generated activity. */
export function phonemeKey(page: Page, symbol: string): Locator {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Accessible names look like "θ, TH (as in thin)", or just "θ" with hints off.
  return page.getByRole("button", { name: new RegExp(`^${escaped}(,|$)`) });
}

/** Clicks a download trigger, saves the file, and returns its name and contents. */
export async function saveDownload(page: Page, trigger: () => Promise<void>, savePath: string) {
  const [download] = await Promise.all([page.waitForEvent("download"), trigger()]);
  await download.saveAs(savePath);
  return { name: download.suggestedFilename(), html: readFileSync(savePath, "utf8") };
}

// ---------- API helpers (the builder's CRUD routes)

type Created = { id: number; name: string };
export type PhonemeRow = { symbol: string; position: number };
export type WordRow = { id: number; text: string; phonemes: PhonemeRow[] };

export async function createWordList(
  request: APIRequestContext,
  name: string,
  difficulty = 3,
): Promise<Created> {
  const response = await request.post("/api/wordlists", { data: { name, difficulty } });
  expect(response.status(), "create word list").toBe(201);
  return (await response.json()).data;
}

export async function createActivity(
  request: APIRequestContext,
  data: Record<string, unknown>,
): Promise<Created> {
  const response = await request.post("/api/activities", { data });
  expect(response.status(), "create activity").toBe(201);
  return (await response.json()).data;
}

/** Best-effort cleanup that never fails a test: the record may already be gone. */
export async function removeQuietly(request: APIRequestContext, path: string) {
  await request.delete(path).catch(() => undefined);
}

// ---------- dashboard helpers

/** The big number on a key-figure card, found by the card's label. */
export function kpiValue(page: Page, label: string): Locator {
  return page
    .locator("dl > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd")
    .first();
}

export async function kpiNumber(page: Page, label: string): Promise<number> {
  const text = (await kpiValue(page, label).textContent()) ?? "";
  return Number(text.replace(/[^0-9.]/g, ""));
}

/** A saved-activity row on the dashboard. */
export function activityRow(page: Page, name: string): Locator {
  return page.getByRole("row", { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
}
