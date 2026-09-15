export type ApiWordEntry = {
  word: string;
  phonemes: string[];
};

export type ApiWordList = {
  id: number;
  name: string;
  difficulty: number;
  words: ApiWordEntry[];
};

type RawWord = {
  text: string;
  phonemes: { symbol: string }[];
};

type RawWordList = {
  id: number;
  name: string;
  difficulty: number;
  words?: RawWord[];
};

/** Fetches every word list, with its words and phonemes, from the backend. */
export async function fetchWordLists(): Promise<ApiWordList[]> {
  const res = await fetch("/api/wordlists?include=words");
  if (!res.ok) {
    throw new Error("Failed to load word lists from the server.");
  }
  const { data }: { data: RawWordList[] } = await res.json();

  return data
    .filter((list) => (list.words?.length ?? 0) > 0)
    .map((list) => ({
      id: list.id,
      name: list.name,
      difficulty: list.difficulty,
      words: (list.words ?? []).map((w) => ({
        word: w.text,
        phonemes: w.phonemes.map((p) => p.symbol),
      })),
    }));
}
