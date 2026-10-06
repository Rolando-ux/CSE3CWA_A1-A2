import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { phonemeKey, saveDownload } from "./helpers";

// USER USE CASE: a teacher builds an activity, downloads the generated HTML,
// and a student opens that file in a normal browser and plays it. The tests
// open the real downloaded file (via file://) so the generated output itself
// is what gets verified, not just the builder that produced it.

async function enterGuess(page: Page, phonemes: string[]) {
  for (const symbol of phonemes) {
    await phonemeKey(page, symbol).click();
  }
  await page.locator("#enterBtn").click();
}

/** The teacher-only answer line shown by the Wordle builder: "word - w ɜː d". */
async function readAnswer(page: Page) {
  const line = await page.getByText(/Answer preview \(teacher only\)/).textContent();
  const match = line?.match(/: (\S+) - (.+)$/);
  expect(match, `could not read the answer from "${line}"`).not.toBeNull();
  return { word: match![1], phonemes: match![2].trim().split(" ") };
}

test.describe("Wordle", () => {
  test("a teacher generates a Wordle and a student wins it", async ({ page }, testInfo) => {
    await page.goto("/wordle");
    const generate = page.getByRole("button", { name: "Generate & Download HTML" });
    await expect(generate).toBeVisible();
    const { word, phonemes } = await readAnswer(page);

    const file = testInfo.outputPath("wordle.html");
    const download = await saveDownload(page, () => generate.click(), file);

    expect(download.name).toBe(`wordle-${word}.html`);
    expect(download.html).toContain("<!DOCTYPE html>");
    await expect(page.getByText(`Downloaded wordle-${word}.html`)).toBeVisible();

    // Open the downloaded file on its own, outside the app, and play it.
    await page.goto(pathToFileURL(file).href);
    await expect(page.locator("#status")).toHaveText("Row 1 of 6");

    // Hints were on, so keys carry the phonetic-to-English hint, e.g. /θ/ = TH.
    await expect(phonemeKey(page, "θ")).toHaveAttribute("aria-label", /TH \(as in thin\)/);

    await enterGuess(page, phonemes);
    await expect(page.locator("#status")).toHaveText(`Correct! "${word}" (${phonemes.join(" ")})`);
  });

  test("the generated Wordle reflects the settings chosen (no hints, 2 guesses) and can be lost", async ({
    page,
  }, testInfo) => {
    await page.goto("/wordle");
    const generate = page.getByRole("button", { name: "Generate & Download HTML" });
    await expect(generate).toBeVisible();
    const { word, phonemes } = await readAnswer(page);

    await page.getByRole("radio", { name: "No" }).check();
    await page.getByLabel("Number of guesses").fill("2");

    const file = testInfo.outputPath("wordle-no-hints.html");
    await saveDownload(page, () => generate.click(), file);
    await page.goto(pathToFileURL(file).href);

    // Settings carried through into the file.
    await expect(page.locator("#status")).toHaveText("Row 1 of 2");
    await expect(page.locator("#grid .row")).toHaveCount(2);
    await expect(page.locator(".key").first()).toBeVisible();
    await expect(page.locator(".tip")).toHaveCount(0);
    await expect(phonemeKey(page, "θ")).toHaveAttribute("aria-label", "θ");

    // Two wrong guesses use up the attempts and reveal the answer.
    const wrong = ["p", "t", "k", "m", "s"].find((symbol) => !phonemes.includes(symbol))!;
    const wrongGuess = phonemes.map(() => wrong);
    await enterGuess(page, wrongGuess);
    await expect(page.locator("#status")).toHaveText("Row 2 of 2");
    await enterGuess(page, wrongGuess);
    await expect(page.locator("#status")).toHaveText(
      `Out of guesses. The word was "${word}" (${phonemes.join(" ")})`,
    );
  });
});

type Placement = { word: string; coords: { row: number; col: number }[] };

/**
 * Builds a Word Search in the builder, downloads it, opens the downloaded file
 * and returns what a student needs to play it.
 */
async function openGeneratedWordSearch(page: Page, testInfo: TestInfo, fileName: string) {
  await page.goto("/word-search");

  // A 10x10 grid almost always fits all five words; if one is left out the
  // builder says so, and a fresh puzzle is generated.
  const generatePuzzle = page.getByRole("button", { name: "Generate Puzzle" });
  await expect(generatePuzzle).toBeVisible();
  for (let attempt = 0; attempt < 5; attempt++) {
    await generatePuzzle.click();
    await expect(page.locator('button[aria-label^="Row "]').first()).toBeVisible();
    if ((await page.getByText(/Could not fit/).count()) === 0) break;
  }
  await expect(page.locator('button[aria-label^="Row "]')).toHaveCount(100);

  const file = testInfo.outputPath(fileName);
  const download = await saveDownload(
    page,
    () => page.getByRole("button", { name: "Download HTML" }).click(),
    file,
  );
  expect(download.name).toBe("word-search.html");
  await expect(page.getByText("Downloaded word-search.html")).toBeVisible();

  await page.goto(pathToFileURL(file).href);
  await expect(page.locator("#grid .cell")).toHaveCount(100);
  await expect(page.locator("#wordList li")).toHaveCount(5);
  await expect(page.locator("#status")).toHaveText("0 of 5 words found");

  const placements = await page.evaluate(
    () => (window as unknown as { PLACEMENTS: Placement[] }).PLACEMENTS,
  );
  expect(placements).toHaveLength(5);

  const cell = (row: number, col: number) =>
    page.locator(`#grid .cell[data-row="${row}"][data-col="${col}"]`);
  const ends = (placement: Placement) => ({
    first: placement.coords[0],
    last: placement.coords[placement.coords.length - 1],
  });
  const foundWord = (placement: Placement) => page.locator(`[id="word-${placement.word}"]`);

  return { placements, cell, ends, foundWord };
}

test.describe("Word Search", () => {
  test("a teacher generates a Word Search and a student finds every word by clicking", async ({
    page,
  }, testInfo) => {
    const { placements, cell, ends, foundWord } = await openGeneratedWordSearch(
      page,
      testInfo,
      "word-search-click.html",
    );

    // Click the first letter, then the last letter, of each word.
    for (const [index, placement] of placements.entries()) {
      const { first, last } = ends(placement);
      await cell(first.row, first.col).click();
      await cell(last.row, last.col).click();

      await expect(foundWord(placement)).toHaveClass(/found/);
      if (index < placements.length - 1) {
        await expect(page.locator("#status")).toHaveText(`${index + 1} of 5 words found`);
      }
    }
    await expect(page.locator("#status")).toHaveText("All words found!");
  });

  test("a student can also select a word by dragging, or with the keyboard", async ({
    page,
  }, testInfo) => {
    const { placements, cell, ends, foundWord } = await openGeneratedWordSearch(
      page,
      testInfo,
      "word-search-drag-keyboard.html",
    );

    // Drag across the first word.
    const drag = ends(placements[0]);
    await cell(drag.first.row, drag.first.col).hover();
    await page.mouse.down();
    await cell(drag.last.row, drag.last.col).hover();
    await page.mouse.up();
    await expect(foundWord(placements[0])).toHaveClass(/found/);
    await expect(page.locator("#status")).toHaveText("1 of 5 words found");

    // Keyboard only for the second word: focus the first letter and press
    // Enter, then the last letter and Enter. The grid is rebuilt after each
    // selection, so each cell is looked up again.
    const keys = ends(placements[1]);
    await cell(keys.first.row, keys.first.col).focus();
    await page.keyboard.press("Enter");
    await expect(cell(keys.first.row, keys.first.col)).toHaveAttribute("aria-pressed", "true");
    await cell(keys.last.row, keys.last.col).focus();
    await page.keyboard.press("Enter");
    await expect(foundWord(placements[1])).toHaveClass(/found/);
    await expect(page.locator("#status")).toHaveText("2 of 5 words found");
  });
});
