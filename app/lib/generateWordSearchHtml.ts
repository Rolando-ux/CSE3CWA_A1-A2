import type { Phoneme } from "../data/phonemes";
import type { Placement } from "./wordSearch";

export type WordSearchGeneratorConfig = {
  grid: string[][];
  placements: Placement[];
  showHints: boolean;
  keyboard: Phoneme[];
};

/** Safely embeds a JSON value inside an inline <script> tag. */
function toInlineJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function generateWordSearchHtml(config: WordSearchGeneratorConfig): string {
  const cols = config.grid[0]?.length ?? 0;

  const dataScript = `
    var GRID = ${toInlineJson(config.grid)};
    var PLACEMENTS = ${toInlineJson(config.placements)};
    var SHOW_HINTS = ${toInlineJson(config.showHints)};
    var KEYBOARD = ${toInlineJson(config.keyboard)};
    var COLS = ${toInlineJson(cols)};
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Phoneme Word Search</title>
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
  h1 { font-size: 1.5rem; margin-bottom: 16px; }
  #status { min-height: 1.5em; font-weight: 600; margin: 12px 0; }
  .word-bank {
    border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px;
    margin-bottom: 20px; max-width: 480px; width: 100%;
  }
  .word-bank h2 { font-size: 0.9rem; margin: 0 0 8px; }
  .word-bank li { font-size: 0.9rem; margin-bottom: 2px; }
  .word-bank li.found { color: #94a3b8; text-decoration: line-through; }
  #grid {
    display: inline-grid;
    gap: 3px;
    margin-bottom: 20px;
    touch-action: none;
    user-select: none;
  }
  .cell {
    width: 36px; height: 36px;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid #cbd5e1; border-radius: 4px;
    font-size: 0.9rem; font-weight: 600;
    background: #fff; cursor: pointer;
  }
  .cell.selected { background: #fde68a; border-color: #f59e0b; }
  .cell.found { background: #16a34a; border-color: #16a34a; color: #fff; }
  .keyboard-section { margin-top: 8px; }
  .keyboard-label { font-size: 0.8rem; font-weight: 600; color: #64748b; margin-bottom: 6px; }
  .keyboard-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; max-width: 480px; }
  .key {
    position: relative;
    min-width: 40px; height: 40px; padding: 0 6px;
    border: 1px solid #cbd5e1; border-radius: 6px;
    background: #fff; cursor: default; font-size: 0.95rem;
  }
  .key .tip {
    visibility: hidden;
    position: absolute; bottom: 110%; left: 50%; transform: translateX(-50%);
    background: #0f172a; color: #fff; padding: 4px 8px; border-radius: 4px;
    font-size: 0.75rem; white-space: nowrap; z-index: 5;
  }
  .key:hover .tip { visibility: visible; }
</style>
</head>
<body>
  <h1>Phoneme Word Search</h1>

  <div class="word-bank">
    <h2>Word bank</h2>
    <ul id="wordList"></ul>
  </div>

  <div id="grid"></div>
  <p id="status"></p>

  <div class="keyboard-section">
    <div class="keyboard-label">Consonants</div>
    <div id="consonants" class="keyboard-row"></div>
    <div class="keyboard-label">Vowels</div>
    <div id="vowels" class="keyboard-row"></div>
  </div>

<script>
${dataScript}

var CONSONANT_COUNT = 24;
var foundWords = {};

function cellSetKey(cells) {
  var parts = cells.map(function (c) { return c.row + "," + c.col; });
  parts.sort();
  return parts.join("|");
}

function getStraightLine(a, b) {
  var dr = b.row - a.row;
  var dc = b.col - a.col;
  var isStraight = dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
  if (!isStraight) return null;
  var steps = Math.max(Math.abs(dr), Math.abs(dc));
  var stepR = steps === 0 ? 0 : dr / steps;
  var stepC = steps === 0 ? 0 : dc / steps;
  var path = [];
  for (var i = 0; i <= steps; i++) {
    path.push({ row: a.row + stepR * i, col: a.col + stepC * i });
  }
  return path;
}

var wordListEl = document.getElementById("wordList");
var gridEl = document.getElementById("grid");
var statusEl = document.getElementById("status");
var consonantsEl = document.getElementById("consonants");
var vowelsEl = document.getElementById("vowels");

function renderWordList() {
  wordListEl.innerHTML = "";
  PLACEMENTS.forEach(function (p) {
    var li = document.createElement("li");
    li.textContent = p.word;
    li.id = "word-" + p.word;
    if (foundWords[p.word]) li.classList.add("found");
    wordListEl.appendChild(li);
  });
}

function renderStatus() {
  var total = PLACEMENTS.length;
  var foundCount = Object.keys(foundWords).length;
  statusEl.textContent = foundCount === total
    ? "All words found!"
    : foundCount + " of " + total + " words found";
}

function renderGrid() {
  gridEl.innerHTML = "";
  gridEl.style.gridTemplateColumns = "repeat(" + COLS + ", minmax(0, 1fr))";
  var foundCellKeys = {};
  PLACEMENTS.forEach(function (p) {
    if (foundWords[p.word]) {
      p.coords.forEach(function (c) { foundCellKeys[c.row + "-" + c.col] = true; });
    }
  });

  GRID.forEach(function (rowArr, r) {
    rowArr.forEach(function (symbol, c) {
      var cell = document.createElement("div");
      cell.className = "cell";
      cell.textContent = symbol;
      cell.dataset.row = r;
      cell.dataset.col = c;
      if (foundCellKeys[r + "-" + c]) cell.classList.add("found");
      gridEl.appendChild(cell);
    });
  });
}

var isSelecting = false;
var startCell = null;
var selectionPath = [];

function cellFromPoint(x, y) {
  var el = document.elementFromPoint(x, y);
  if (!el || el.dataset.row === undefined) return null;
  return { row: Number(el.dataset.row), col: Number(el.dataset.col) };
}

function updateSelectionVisual() {
  var cells = gridEl.querySelectorAll(".cell");
  var pathKeys = {};
  selectionPath.forEach(function (c) { pathKeys[c.row + "-" + c.col] = true; });
  cells.forEach(function (cell) {
    var key = cell.dataset.row + "-" + cell.dataset.col;
    if (!cell.classList.contains("found")) {
      cell.classList.toggle("selected", !!pathKeys[key]);
    }
  });
}

gridEl.addEventListener("pointerdown", function (e) {
  var target = e.target;
  if (target.dataset.row === undefined) return;
  startCell = { row: Number(target.dataset.row), col: Number(target.dataset.col) };
  isSelecting = true;
  selectionPath = [startCell];
  updateSelectionVisual();
});

window.addEventListener("pointermove", function (e) {
  if (!isSelecting || !startCell) return;
  var current = cellFromPoint(e.clientX, e.clientY);
  if (!current) return;
  var path = getStraightLine(startCell, current);
  if (path) {
    selectionPath = path;
    updateSelectionVisual();
  }
});

window.addEventListener("pointerup", function () {
  if (!isSelecting) return;
  isSelecting = false;
  if (selectionPath.length > 1) {
    var pathKey = cellSetKey(selectionPath);
    for (var i = 0; i < PLACEMENTS.length; i++) {
      var p = PLACEMENTS[i];
      if (foundWords[p.word]) continue;
      if (cellSetKey(p.coords) === pathKey) {
        foundWords[p.word] = true;
        break;
      }
    }
  }
  selectionPath = [];
  startCell = null;
  renderGrid();
  renderWordList();
  renderStatus();
});

function renderKeyboard() {
  KEYBOARD.forEach(function (phoneme, index) {
    var key = document.createElement("div");
    key.className = "key";
    key.textContent = phoneme.symbol;
    if (SHOW_HINTS) {
      var tip = document.createElement("span");
      tip.className = "tip";
      tip.textContent = phoneme.hint;
      key.appendChild(tip);
    }
    if (index < CONSONANT_COUNT) consonantsEl.appendChild(key);
    else vowelsEl.appendChild(key);
  });
}

renderWordList();
renderGrid();
renderStatus();
renderKeyboard();
</script>
</body>
</html>`;
}
