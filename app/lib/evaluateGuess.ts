export type CellStatus = "correct" | "present" | "absent";

/**
 * Compares a guessed phoneme row against the answer, cell by cell, using the
 * same two-pass approach standard Wordle uses so repeated phonemes in the
 * answer are handled correctly (a repeated guess phoneme is only marked
 * "present" as many times as it actually occurs, unmatched, in the answer).
 */
export function evaluateGuess(guess: string[], answer: string[]): CellStatus[] {
  const result: CellStatus[] = Array(answer.length).fill("absent");
  const answerUsed: boolean[] = Array(answer.length).fill(false);

  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
      answerUsed[i] = true;
    }
  }

  for (let i = 0; i < guess.length; i++) {
    if (result[i] === "correct") continue;
    const matchIndex = answer.findIndex(
      (phoneme, j) => phoneme === guess[i] && !answerUsed[j],
    );
    if (matchIndex !== -1) {
      result[i] = "present";
      answerUsed[matchIndex] = true;
    }
  }

  return result;
}
