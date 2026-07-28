/**
 * Source: HCE_Wordle_Phoneme_Corpus.docx (broad HCE transcription), provided
 * by the unit coordinator. The keyboard and word-list tables in that
 * document use two different Unicode codepoints for the same "g" sound
 * (plain "g" U+0067 and IPA script "ɡ" U+0261) - both are normalised to
 * plain "g" here so exact-match comparisons (e.g. Wordle guess checking)
 * are not silently broken by an invisible codepoint mismatch.
 */

export type Phoneme = {
  symbol: string;
  /** Hover-hint label shown to the teacher/student, e.g. "TH (as in thin)". */
  hint: string;
};

export const CONSONANTS: Phoneme[] = [
  { symbol: "p", hint: "P (as in pond)" },
  { symbol: "t", hint: "T (as in tent)" },
  { symbol: "k", hint: "K (as in book)" },
  { symbol: "b", hint: "B (as in bed)" },
  { symbol: "d", hint: "D (as in bed)" },
  { symbol: "g", hint: "G (as in gift)" },
  { symbol: "n", hint: "N (as in fan)" },
  { symbol: "m", hint: "M (as in jam)" },
  { symbol: "ŋ", hint: "NG (as in ring)" },
  { symbol: "f", hint: "F (as in fan)" },
  { symbol: "s", hint: "S (as in sun)" },
  { symbol: "θ", hint: "TH (as in thin)" },
  { symbol: "ʃ", hint: "SH (as in ship)" },
  { symbol: "v", hint: "V (as in van)" },
  { symbol: "z", hint: "Z (as in zip)" },
  { symbol: "ð", hint: "TH (as in then)" },
  { symbol: "ʒ", hint: "S (as in treasure)" },
  { symbol: "l", hint: "L (as in log)" },
  { symbol: "ɹ", hint: "R (as in ring)" },
  { symbol: "w", hint: "W (as in win)" },
  { symbol: "j", hint: "Y (as in yes)" },
  { symbol: "h", hint: "H (as in hat)" },
  { symbol: "tʃ", hint: "CH (as in chin)" },
  { symbol: "dʒ", hint: "J (as in jam)" },
];

export const VOWELS: Phoneme[] = [
  { symbol: "iː", hint: "EE (as in street)" },
  { symbol: "ɪ", hint: "I (as in bid)" },
  { symbol: "e", hint: "E (as in bed)" },
  { symbol: "eː", hint: "long E (as in air)" },
  { symbol: "æ", hint: "A (as in bad)" },
  { symbol: "ɐ", hint: "U (as in bud)" },
  { symbol: "ɐː", hint: "AR (as in bark)" },
  { symbol: "ɜː", hint: "IR (as in bird)" },
  { symbol: "ʉː", hint: "OO (as in boot)" },
  { symbol: "ɔ", hint: "O (as in stop)" },
  { symbol: "oː", hint: "OR (as in fork)" },
  { symbol: "ʊ", hint: "OO (as in book)" },
  { symbol: "æɪ", hint: "AI (as in bait)" },
  { symbol: "ɑe", hint: "IGH (as in bike)" },
  { symbol: "oɪ", hint: "OY (as in boil)" },
  { symbol: "əʉ", hint: "OA (as in boat)" },
  { symbol: "æɔ", hint: "OW (as in cloud)" },
  { symbol: "ɪə", hint: "EAR (as in beard)" },
  { symbol: "ə", hint: "UH (as in sofa)" },
];

export const PHONEME_KEYBOARD: Phoneme[] = [...CONSONANTS, ...VOWELS];

export const PHONEME_HINTS: Record<string, string> = Object.fromEntries(
  PHONEME_KEYBOARD.map((p) => [p.symbol, p.hint]),
);

export type PhonemeWord = {
  word: string;
  phonemes: string[];
};

export type Difficulty = 3 | 4 | 5;

export const WORD_LISTS: Record<Difficulty, PhonemeWord[]> = {
  3: [
    { word: "bed", phonemes: ["b", "e", "d"] },
    { word: "bid", phonemes: ["b", "ɪ", "d"] },
    { word: "bad", phonemes: ["b", "æ", "d"] },
    { word: "bud", phonemes: ["b", "ɐ", "d"] },
    { word: "bird", phonemes: ["b", "ɜː", "d"] },
    { word: "bark", phonemes: ["b", "ɐː", "k"] },
    { word: "book", phonemes: ["b", "ʊ", "k"] },
    { word: "boot", phonemes: ["b", "ʉː", "t"] },
    { word: "boat", phonemes: ["b", "əʉ", "t"] },
    { word: "bike", phonemes: ["b", "ɑe", "k"] },
    { word: "bait", phonemes: ["b", "æɪ", "t"] },
    { word: "boil", phonemes: ["b", "oɪ", "l"] },
    { word: "beard", phonemes: ["b", "ɪə", "d"] },
    { word: "choice", phonemes: ["tʃ", "oɪ", "s"] },
    { word: "thin", phonemes: ["θ", "ɪ", "n"] },
    { word: "then", phonemes: ["ð", "e", "n"] },
    { word: "ship", phonemes: ["ʃ", "ɪ", "p"] },
    { word: "chin", phonemes: ["tʃ", "ɪ", "n"] },
    { word: "jam", phonemes: ["dʒ", "æ", "m"] },
    { word: "yes", phonemes: ["j", "e", "s"] },
    { word: "win", phonemes: ["w", "ɪ", "n"] },
    { word: "ring", phonemes: ["ɹ", "ɪ", "ŋ"] },
    { word: "log", phonemes: ["l", "ɔ", "g"] },
    { word: "fan", phonemes: ["f", "æ", "n"] },
    { word: "van", phonemes: ["v", "æ", "n"] },
    { word: "sun", phonemes: ["s", "ɐ", "n"] },
    { word: "zip", phonemes: ["z", "ɪ", "p"] },
    { word: "gum", phonemes: ["g", "ɐ", "m"] },
    { word: "hat", phonemes: ["h", "æ", "t"] },
    { word: "fork", phonemes: ["f", "oː", "k"] },
  ],
  4: [
    { word: "stop", phonemes: ["s", "t", "ɔ", "p"] },
    { word: "frog", phonemes: ["f", "ɹ", "ɔ", "g"] },
    { word: "clap", phonemes: ["k", "l", "æ", "p"] },
    { word: "slip", phonemes: ["s", "l", "ɪ", "p"] },
    { word: "drum", phonemes: ["d", "ɹ", "ɐ", "m"] },
    { word: "grin", phonemes: ["g", "ɹ", "ɪ", "n"] },
    { word: "train", phonemes: ["t", "ɹ", "æɪ", "n"] },
    { word: "cloud", phonemes: ["k", "l", "æɔ", "d"] },
    { word: "snake", phonemes: ["s", "n", "æɪ", "k"] },
    { word: "smile", phonemes: ["s", "m", "ɑe", "l"] },
    { word: "milk", phonemes: ["m", "ɪ", "l", "k"] },
    { word: "hand", phonemes: ["h", "æ", "n", "d"] },
    { word: "tent", phonemes: ["t", "e", "n", "t"] },
    { word: "jump", phonemes: ["dʒ", "ɐ", "m", "p"] },
    { word: "lamp", phonemes: ["l", "æ", "m", "p"] },
    { word: "bank", phonemes: ["b", "æ", "ŋ", "k"] },
    { word: "frame", phonemes: ["f", "ɹ", "æɪ", "m"] },
    { word: "cold", phonemes: ["k", "əʉ", "l", "d"] },
    { word: "wind", phonemes: ["w", "ɪ", "n", "d"] },
    { word: "soft", phonemes: ["s", "ɔ", "f", "t"] },
    { word: "gift", phonemes: ["g", "ɪ", "f", "t"] },
    { word: "desk", phonemes: ["d", "e", "s", "k"] },
    { word: "left", phonemes: ["l", "e", "f", "t"] },
    { word: "pond", phonemes: ["p", "ɔ", "n", "d"] },
    { word: "golf", phonemes: ["g", "ɔ", "l", "f"] },
    { word: "silk", phonemes: ["s", "ɪ", "l", "k"] },
    { word: "great", phonemes: ["g", "ɹ", "æɪ", "t"] },
    { word: "crab", phonemes: ["k", "ɹ", "æ", "b"] },
    { word: "plug", phonemes: ["p", "l", "ɐ", "g"] },
    { word: "quiz", phonemes: ["k", "w", "ɪ", "z"] },
  ],
  5: [
    { word: "stamp", phonemes: ["s", "t", "æ", "m", "p"] },
    { word: "plant", phonemes: ["p", "l", "æ", "n", "t"] },
    { word: "blank", phonemes: ["b", "l", "æ", "ŋ", "k"] },
    { word: "grand", phonemes: ["g", "ɹ", "æ", "n", "d"] },
    { word: "clamp", phonemes: ["k", "l", "æ", "m", "p"] },
    { word: "twist", phonemes: ["t", "w", "ɪ", "s", "t"] },
    { word: "trust", phonemes: ["t", "ɹ", "ɐ", "s", "t"] },
    { word: "drink", phonemes: ["d", "ɹ", "ɪ", "ŋ", "k"] },
    { word: "brisk", phonemes: ["b", "ɹ", "ɪ", "s", "k"] },
    { word: "shrimp", phonemes: ["ʃ", "ɹ", "ɪ", "m", "p"] },
    { word: "scrap", phonemes: ["s", "k", "ɹ", "æ", "p"] },
    { word: "scribe", phonemes: ["s", "k", "ɹ", "ɑe", "b"] },
    { word: "scream", phonemes: ["s", "k", "ɹ", "iː", "m"] },
    { word: "splash", phonemes: ["s", "p", "l", "æ", "ʃ"] },
    { word: "spring", phonemes: ["s", "p", "ɹ", "ɪ", "ŋ"] },
    { word: "strap", phonemes: ["s", "t", "ɹ", "æ", "p"] },
    { word: "street", phonemes: ["s", "t", "ɹ", "iː", "t"] },
    { word: "scrub", phonemes: ["s", "k", "ɹ", "ɐ", "b"] },
    { word: "flask", phonemes: ["f", "l", "ɐː", "s", "k"] },
    { word: "clasp", phonemes: ["k", "l", "ɐː", "s", "p"] },
    { word: "cleft", phonemes: ["k", "l", "e", "f", "t"] },
    { word: "glint", phonemes: ["g", "l", "ɪ", "n", "t"] },
    { word: "blend", phonemes: ["b", "l", "e", "n", "d"] },
    { word: "strain", phonemes: ["s", "t", "ɹ", "æɪ", "n"] },
    { word: "thrust", phonemes: ["θ", "ɹ", "ɐ", "s", "t"] },
    { word: "sprawl", phonemes: ["s", "p", "ɹ", "oː", "l"] },
    { word: "scrawl", phonemes: ["s", "k", "ɹ", "oː", "l"] },
    { word: "sprig", phonemes: ["s", "p", "ɹ", "ɪ", "g"] },
    { word: "sprout", phonemes: ["s", "p", "ɹ", "æɔ", "t"] },
    { word: "smoked", phonemes: ["s", "m", "əʉ", "k", "t"] },
  ],
};
