import { expect, test } from "@playwright/test";
import {
  activityRow,
  createActivity,
  createWordList,
  removeQuietly,
  uniqueName,
  type WordRow,
} from "./helpers";

// BUILDER USE CASE: a teacher manages the stored content the builders draw on
// - a word list, the words and phonemes in it, and an activity configuration -
// through the full create / read / update / delete cycle, including bad input
// being refused. Each step is then checked where a teacher would see it: the
// dashboard's saved activities, word-list table and activity feed.
//
// (The app's CRUD is an API; the dashboard is its screen, so the writes go
// through the API and the results are verified in the browser.)

test("a teacher can create, read, update and delete a word list, word and activity", async ({
  request,
  page,
}) => {
  const listName = uniqueName("E2E list");
  const renamedList = `${listName} (renamed)`;
  const activityName = uniqueName("E2E activity");
  const renamedActivity = `${activityName} (edited)`;

  let listId: number | undefined;
  let activityId: number | undefined;
  try {
    // ---- CREATE a word list, a word (multi-symbol phonemes stored one per row), and an activity
    const list = await createWordList(request, listName, 3);
    listId = list.id;

    const addWord = await request.post(`/api/wordlists/${list.id}/words`, {
      data: { text: "cat", phonemes: ["k", "æ", "t"] },
    });
    expect(addWord.status()).toBe(201);
    const word: WordRow = (await addWord.json()).data;
    expect(word.phonemes.map((p) => p.symbol)).toEqual(["k", "æ", "t"]);

    const activity = await createActivity(request, {
      name: activityName,
      type: "WORDLE",
      wordListId: list.id,
      hintsEnabled: true,
      guessCount: 6,
    });
    activityId = activity.id;

    // ---- READ it back
    const readList = await (await request.get(`/api/wordlists/${list.id}`)).json();
    expect(readList.data.name).toBe(listName);
    expect(readList.data.words).toHaveLength(1);
    expect(readList.data.words[0].text).toBe("cat");

    const lists = await (await request.get("/api/wordlists?include=words")).json();
    const found = lists.data.find((l: { id: number }) => l.id === list.id);
    expect(found.words[0].phonemes.map((p: { symbol: string }) => p.symbol)).toEqual(["k", "æ", "t"]);

    // ---- bad input is refused with a clear message, and nothing is stored
    const unknownPhoneme = await request.post(`/api/wordlists/${list.id}/words`, {
      data: { text: "zzz", phonemes: ["k", "notaphoneme", "t"] },
    });
    expect(unknownPhoneme.status()).toBe(400);
    expect((await unknownPhoneme.json()).error).toBeTruthy();

    const wrongLength = await request.post(`/api/wordlists/${list.id}/words`, {
      data: { text: "at", phonemes: ["æ", "t"] },
    });
    expect(wrongLength.status()).toBe(400);

    const blankName = await request.post("/api/wordlists", { data: { name: "  ", difficulty: 3 } });
    expect(blankName.status()).toBe(400);

    const badGuessCount = await request.post("/api/activities", {
      data: { name: "x", type: "WORDLE", wordListId: list.id, guessCount: 99 },
    });
    expect(badGuessCount.status()).toBe(400);

    expect(
      (await (await request.get(`/api/wordlists/${list.id}`)).json()).data.words,
      "rejected words must not be stored",
    ).toHaveLength(1);

    // ---- UPDATE the word, the word list and the activity
    const editWord = await request.patch(`/api/words/${word.id}`, {
      data: { text: "cap", phonemes: ["k", "æ", "p"] },
    });
    expect(editWord.status()).toBe(200);
    const edited: WordRow = (await editWord.json()).data;
    expect(edited.text).toBe("cap");
    expect(edited.phonemes.map((p) => p.symbol)).toEqual(["k", "æ", "p"]);

    expect(
      (await request.patch(`/api/wordlists/${list.id}`, { data: { name: renamedList, difficulty: 3 } })).status(),
    ).toBe(200);
    expect(
      (
        await request.patch(`/api/activities/${activity.id}`, {
          data: {
            name: renamedActivity,
            type: "WORDLE",
            wordListId: list.id,
            hintsEnabled: false,
            guessCount: 4,
          },
        })
      ).status(),
    ).toBe(200);

    const readActivity = (await (await request.get(`/api/activities/${activity.id}`)).json()).data;
    expect(readActivity).toMatchObject({ name: renamedActivity, guessCount: 4, hintsEnabled: false });

    // ---- the dashboard shows the stored data and records what happened
    await page.goto("/dashboard");
    const row = activityRow(page, renamedActivity);
    await expect(row).toBeVisible();
    await expect(row).toContainText("Wordle");
    await expect(row).toContainText(`${renamedList} (3 phonemes)`);
    await expect(row).toContainText("4 guesses, hints off");

    const listsTable = page.getByRole("table", { name: "Stored word lists" });
    await expect(listsTable.getByRole("row", { name: renamedList })).toContainText("1");

    const feed = page.locator('section[aria-labelledby="events-heading"]');
    await expect(feed).toContainText(`Updated "${renamedActivity}"`);

    // the stored settings drive the generated activity
    await page.getByRole("button", { name: `Preview ${renamedActivity}` }).click();
    const preview = page.frameLocator("iframe[title^='Generated activity']");
    await expect(preview.locator("#status")).toHaveText("Row 1 of 4");

    // ---- DELETE everything, each time confirming it is really gone
    expect((await request.delete(`/api/activities/${activity.id}`)).status()).toBe(200);
    expect((await request.get(`/api/activities/${activity.id}`)).status()).toBe(404);

    expect((await request.delete(`/api/words/${word.id}`)).status()).toBe(200);
    expect((await request.get(`/api/words/${word.id}`)).status()).toBe(404);

    expect((await request.delete(`/api/wordlists/${list.id}`)).status()).toBe(200);
    expect((await request.get(`/api/wordlists/${list.id}`)).status()).toBe(404);
    activityId = undefined;
    listId = undefined;

    await page.reload();
    await expect(page.locator("#saved-heading")).toBeVisible();
    await expect(activityRow(page, renamedActivity)).toHaveCount(0);
    await expect(
      page.locator('section[aria-labelledby="events-heading"]'),
    ).toContainText(`Deleted "${renamedActivity}"`);
  } finally {
    // If an assertion failed part-way, don't leave test data behind.
    if (activityId !== undefined) await removeQuietly(request, `/api/activities/${activityId}`);
    if (listId !== undefined) await removeQuietly(request, `/api/wordlists/${listId}`);
  }
});

test("invalid requests are rejected without crashing and are counted as invalid data", async ({
  request,
  page,
}) => {
  const malformed = await request.post("/api/wordlists", {
    headers: { "Content-Type": "application/json" },
    data: "{ this is not json",
  });
  expect(malformed.status()).toBe(400);

  const missing = await request.post("/api/generate", { data: { type: "WORDLE" } });
  expect(missing.status()).toBe(400);
  expect((await missing.json()).error).toBeTruthy();

  const unknownActivity = await request.post("/api/generate", { data: { activityId: 999999 } });
  expect(unknownActivity.status()).toBe(404);

  // The activity feed on the dashboard shows the rejected input.
  await page.goto("/dashboard");
  await expect(
    page.locator('section[aria-labelledby="events-heading"]'),
  ).toContainText("Invalid data rejected");
});
