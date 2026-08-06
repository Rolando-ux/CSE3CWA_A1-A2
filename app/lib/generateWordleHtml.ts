import type { Phoneme } from "../data/phonemes";

export type WordleGeneratorConfig = {
  word: string;
  phonemes: string[];
  guessCount: number;
  showHints: boolean;
  keyboard: Phoneme[];
};

/** Safely embeds a JSON value inside an inline <script> tag. */
function toInlineJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function generateWordleHtml(config: WordleGeneratorConfig): string {
  const dataScript = `
    var ANSWER = ${toInlineJson(config.phonemes)};
    var ANSWER_WORD = ${toInlineJson(config.word)};
    var GUESS_COUNT = ${toInlineJson(config.guessCount)};
    var SHOW_HINTS = ${toInlineJson(config.showHints)};
    var KEYBOARD = ${toInlineJson(config.keyboard)};
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Phoneme Wordle: ${escapeHtml(config.word)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    background: #f8fafc;
    color: #1e293b;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;
    margin: 0;
  }
  h1 { font-size: 1.5rem; margin-bottom: 4px; }
  .subtitle { color: #64748b; margin-bottom: 20px; text-align: center; }
  .grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
  .row { display: flex; gap: 8px; }
  .cell {
    width: 48px; height: 48px;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid #cbd5e1; border-radius: 6px;
    font-size: 1.1rem; font-weight: 600;
    background: #fff;
  }
  .cell.correct { background: #16a34a; border-color: #16a34a; color: #fff; }
  .cell.present { background: #f59e0b; border-color: #f59e0b; color: #fff; }
  .cell.absent { background: #94a3b8; border-color: #94a3b8; color: #fff; }
  #status { min-height: 1.5em; font-weight: 600; margin-bottom: 16px; }
  .keyboard-section { margin-bottom: 8px; }
  .keyboard-label { font-size: 0.8rem; font-weight: 600; color: #64748b; margin-bottom: 6px; }
  .keyboard-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; max-width: 480px; }
  .key {
    position: relative;
    min-width: 40px; height: 40px; padding: 0 6px;
    border: 1px solid #cbd5e1; border-radius: 6px;
    background: #fff; cursor: pointer; font-size: 0.95rem;
  }
  .key:hover { background: #f1f5f9; }
  .key .tip {
    visibility: hidden;
    position: absolute; bottom: 110%; left: 50%; transform: translateX(-50%);
    background: #0f172a; color: #fff; padding: 4px 8px; border-radius: 4px;
    font-size: 0.75rem; white-space: nowrap; z-index: 5;
  }
  .key:hover .tip { visibility: visible; }
  .controls { display: flex; gap: 10px; margin-top: 8px; }
  button.action {
    padding: 10px 18px; border-radius: 6px; border: none;
    background: #0f172a; color: #fff; font-weight: 600; cursor: pointer;
  }
  button.action:disabled { opacity: 0.4; cursor: default; }
  button.action.secondary { background: #64748b; }
</style>
</head>
<body>
  <h1>Phoneme Wordle</h1>
  <p class="subtitle">Guess the phoneme-based word. ${config.guessCount} guesses.</p>

  <div id="grid" class="grid"></div>
  <p id="status"></p>

  <div class="keyboard-section">
    <div class="keyboard-label">Consonants</div>
    <div id="consonants" class="keyboard-row"></div>
    <div class="keyboard-label">Vowels</div>
    <div id="vowels" class="keyboard-row"></div>
  </div>

  <div class="controls">
    <button type="button" id="backspaceBtn" class="action secondary">Backspace</button>
    <button type="button" id="enterBtn" class="action">Enter</button>
  </div>

<script>
${dataScript}

var CONSONANT_COUNT = 24;

function evaluateGuess(guess, answer) {
  var result = [];
  var answerUsed = [];
  for (var i = 0; i < answer.length; i++) { result.push("absent"); answerUsed.push(false); }
  for (var i = 0; i < guess.length; i++) {
    if (guess[i] === answer[i]) { result[i] = "correct"; answerUsed[i] = true; }
  }
  for (var i = 0; i < guess.length; i++) {
    if (result[i] === "correct") continue;
    for (var j = 0; j < answer.length; j++) {
      if (!answerUsed[j] && answer[j] === guess[i]) { result[i] = "present"; answerUsed[j] = true; break; }
    }
  }
  return result;
}

var state = {
  guesses: [],
  currentRow: 0,
  currentCol: 0,
  gameStatus: "playing"
};
for (var r = 0; r < GUESS_COUNT; r++) {
  var row = [];
  for (var c = 0; c < ANSWER.length; c++) row.push("");
  state.guesses.push(row);
}

var gridEl = document.getElementById("grid");
var statusEl = document.getElementById("status");
var consonantsEl = document.getElementById("consonants");
var vowelsEl = document.getElementById("vowels");
var backspaceBtn = document.getElementById("backspaceBtn");
var enterBtn = document.getElementById("enterBtn");

function renderGrid() {
  gridEl.innerHTML = "";
  for (var r = 0; r < state.guesses.length; r++) {
    var rowEl = document.createElement("div");
    rowEl.className = "row";
    for (var c = 0; c < state.guesses[r].length; c++) {
      var cellEl = document.createElement("div");
      cellEl.className = "cell";
      cellEl.textContent = state.guesses[r][c];
      if (state.feedback && state.feedback[r]) {
        cellEl.classList.add(state.feedback[r][c]);
      }
      rowEl.appendChild(cellEl);
    }
    gridEl.appendChild(rowEl);
  }
}

function renderStatus() {
  if (state.gameStatus === "won") {
    statusEl.textContent = 'Correct! "' + ANSWER_WORD + '" (' + ANSWER.join(" ") + ")";
  } else if (state.gameStatus === "lost") {
    statusEl.textContent = 'Out of guesses. The word was "' + ANSWER_WORD + '" (' + ANSWER.join(" ") + ")";
  } else {
    statusEl.textContent = "Row " + (state.currentRow + 1) + " of " + GUESS_COUNT;
  }
}

function renderControls() {
  var playing = state.gameStatus === "playing";
  backspaceBtn.disabled = !playing || state.currentCol === 0;
  enterBtn.disabled = !playing || state.currentCol !== ANSWER.length;
}

function renderKeyboard() {
  KEYBOARD.forEach(function (phoneme, index) {
    var key = document.createElement("button");
    key.type = "button";
    key.className = "key";
    key.textContent = phoneme.symbol;
    if (SHOW_HINTS) {
      key.setAttribute("aria-label", phoneme.symbol + ", " + phoneme.hint);
      var tip = document.createElement("span");
      tip.className = "tip";
      tip.textContent = phoneme.hint;
      key.appendChild(tip);
    } else {
      key.setAttribute("aria-label", phoneme.symbol);
    }
    key.addEventListener("click", function () { selectPhoneme(phoneme.symbol); });
    if (index < CONSONANT_COUNT) consonantsEl.appendChild(key);
    else vowelsEl.appendChild(key);
  });
}

function selectPhoneme(symbol) {
  if (state.gameStatus !== "playing" || state.currentCol >= ANSWER.length) return;
  state.guesses[state.currentRow][state.currentCol] = symbol;
  state.currentCol++;
  renderGrid();
  renderControls();
}

function backspace() {
  if (state.gameStatus !== "playing" || state.currentCol === 0) return;
  state.currentCol--;
  state.guesses[state.currentRow][state.currentCol] = "";
  renderGrid();
  renderControls();
}

function enter() {
  if (state.gameStatus !== "playing" || state.currentCol !== ANSWER.length) return;
  var rowStatuses = evaluateGuess(state.guesses[state.currentRow], ANSWER);
  if (!state.feedback) state.feedback = [];
  state.feedback[state.currentRow] = rowStatuses;

  var hasWon = rowStatuses.every(function (s) { return s === "correct"; });
  if (hasWon) {
    state.gameStatus = "won";
  } else if (state.currentRow + 1 >= GUESS_COUNT) {
    state.gameStatus = "lost";
  } else {
    state.currentRow++;
    state.currentCol = 0;
  }
  renderGrid();
  renderStatus();
  renderControls();
}

backspaceBtn.addEventListener("click", backspace);
enterBtn.addEventListener("click", enter);

renderKeyboard();
renderGrid();
renderStatus();
renderControls();
</script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
