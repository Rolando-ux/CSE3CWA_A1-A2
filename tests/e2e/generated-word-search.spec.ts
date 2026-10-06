import { expect, test, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { PHONEME_KEYBOARD } from "../../app/data/phonemes";
import { generateWordSearchHtml } from "../../app/lib/generateWordSearchHtml";

// Regression tests for the generated Word Search, using a puzzle built by hand
// so the tricky case is guaranteed instead of left to chance.
//
// The case: two words that START ON THE SAME CELL (here "bed" runs across and
// "bad" runs down from the same "b"). About one random puzzle in ten has a pair
// like this. Once the first word is found, its cells are marked found, and the
// second word must still be selectable from that shared cell - by mouse click
// and by keyboard, not only by dragging.
//
//      col0 col1 col2 col3 col4
// row0   b    e    d    p    p      bed: (0,0) (0,1) (0,2)
// row1   æ    p    p    p    p      bad: (0,0) (1,0) (2,0)
// row2   d    p    p    p    p
// row3   p    p    p    p    p
// row4   p    p    p    p    p

const GRID = [
  ["b", "e", "d", "p", "p"],
  ["æ", "p", "p", "p", "p"],
  ["d", "p", "p", "p", "p"],
  ["p", "p", "p", "p", "p"],
  ["p", "p", "p", "p", "p"],
];

const PLACEMENTS = [
  { word: "bed", coords: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
  { word: "bad", coords: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }] },
];

async function openCrossingPuzzle(page: Page, filePath: string) {
  const html = generateWordSearchHtml({
    grid: GRID,
    placements: PLACEMENTS,
    showHints: true,
    keyboard: PHONEME_KEYBOARD,
  });
  writeFileSync(filePath, html, "utf8");

  await page.goto(pathToFileURL(filePath).href);
  await expect(page.locator("#status")).toHaveText("0 of 2 words found");

  const cell = (row: number, col: number) =>
    page.locator(`#grid .cell[data-row="${row}"][data-col="${col}"]`);
  return { cell };
}

test("words sharing a starting cell can both be found by clicking", async ({ page }, testInfo) => {
  const { cell } = await openCrossingPuzzle(page, testInfo.outputPath("crossing-click.html"));

  await cell(0, 0).click();
  await cell(0, 2).click();
  await expect(page.locator('[id="word-bed"]')).toHaveClass(/found/);
  await expect(page.locator("#status")).toHaveText("1 of 2 words found");

  // The shared "b" is now marked found, but it must still start the next word.
  await cell(0, 0).click();
  await cell(2, 0).click();
  await expect(page.locator('[id="word-bad"]')).toHaveClass(/found/);
  await expect(page.locator("#status")).toHaveText("All words found!");
});

test("words sharing a starting cell can both be found with the keyboard alone", async ({
  page,
}, testInfo) => {
  const { cell } = await openCrossingPuzzle(page, testInfo.outputPath("crossing-keyboard.html"));

  // The grid is rebuilt after each selection, so every cell is looked up afresh.
  const select = async (from: [number, number], to: [number, number]) => {
    await cell(...from).focus();
    await page.keyboard.press("Enter");
    await cell(...to).focus();
    await page.keyboard.press("Enter");
  };

  await select([0, 0], [0, 2]);
  await expect(page.locator('[id="word-bed"]')).toHaveClass(/found/);

  await select([0, 0], [2, 0]);
  await expect(page.locator('[id="word-bad"]')).toHaveClass(/found/);
  await expect(page.locator("#status")).toHaveText("All words found!");
});

test("a cell that is not a straight line from the first tap becomes the new start", async ({
  page,
}, testInfo) => {
  const { cell } = await openCrossingPuzzle(page, testInfo.outputPath("crossing-bad-line.html"));

  // (0,0) then (1,2) is not a straight line, so the second tap restarts the selection.
  await cell(0, 0).click();
  await cell(1, 2).click();
  await expect(cell(1, 2)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#status")).toHaveText("0 of 2 words found");

  // ...and a valid word can then still be selected normally.
  await cell(0, 0).click();
  await cell(0, 2).click();
  await expect(page.locator('[id="word-bed"]')).toHaveClass(/found/);
});
