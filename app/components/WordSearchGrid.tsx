"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Placement } from "../lib/wordSearch";

type Cell = { row: number; col: number };

type WordSearchGridProps = {
  grid: string[][];
  placements: Placement[];
  foundWords: Set<string>;
  onWordFound: (word: string) => void;
};

function getStraightLine(a: Cell, b: Cell): Cell[] | null {
  const dr = b.row - a.row;
  const dc = b.col - a.col;
  const isStraight = dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
  if (!isStraight) return null;

  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  const stepR = steps === 0 ? 0 : dr / steps;
  const stepC = steps === 0 ? 0 : dc / steps;

  const path: Cell[] = [];
  for (let i = 0; i <= steps; i++) {
    path.push({ row: a.row + stepR * i, col: a.col + stepC * i });
  }
  return path;
}

function cellSetKey(cells: Cell[]): string {
  return cells
    .map((c) => `${c.row},${c.col}`)
    .sort()
    .join("|");
}

export default function WordSearchGrid({
  grid,
  placements,
  foundWords,
  onWordFound,
}: WordSearchGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const startCellRef = useRef<Cell | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionPath, setSelectionPath] = useState<Cell[]>([]);
  // Separate from drag: lets mouse-click or keyboard (Enter/Space) users
  // select a start cell, then a second activation on an end cell, as a
  // fully keyboard-operable alternative to pointer-dragging.
  const [anchorCell, setAnchorCell] = useState<Cell | null>(null);
  const instructionsId = useId();

  const cols = grid[0]?.length ?? 0;

  function cellFromPoint(clientX: number, clientY: number): Cell | null {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const row = el?.dataset.row;
    const col = el?.dataset.col;
    if (row === undefined || col === undefined) return null;
    return { row: Number(row), col: Number(col) };
  }

  function tryMatch(path: Cell[]) {
    if (path.length < 2) return;
    const pathKey = cellSetKey(path);
    for (const placement of placements) {
      if (foundWords.has(placement.word)) continue;
      if (cellSetKey(placement.coords) === pathKey) {
        onWordFound(placement.word);
        break;
      }
    }
  }

  const foundCellKeys = new Set(
    placements
      .filter((p) => foundWords.has(p.word))
      .flatMap((p) => p.coords.map((c) => `${c.row}-${c.col}`)),
  );

  function handlePointerDown(cell: Cell) {
    startCellRef.current = cell;
    setIsSelecting(true);
    setSelectionPath([cell]);
    setAnchorCell(null);
  }

  function handleCellActivate(cell: Cell) {
    // A stray click after a completed drag, or clicking an already-found
    // cell, shouldn't disturb the two-tap anchor state.
    if (foundCellKeys.has(`${cell.row}-${cell.col}`)) return;
    if (!anchorCell) {
      setAnchorCell(cell);
      return;
    }
    if (anchorCell.row === cell.row && anchorCell.col === cell.col) {
      setAnchorCell(null);
      return;
    }
    const path = getStraightLine(anchorCell, cell);
    if (path) {
      tryMatch(path);
      setAnchorCell(null);
    } else {
      setAnchorCell(cell);
    }
  }

  useEffect(() => {
    if (!isSelecting) return;

    function handlePointerMove(e: PointerEvent) {
      const start = startCellRef.current;
      if (!start) return;
      const current = cellFromPoint(e.clientX, e.clientY);
      if (!current) return;
      const path = getStraightLine(start, current);
      if (path) setSelectionPath(path);
    }

    function handlePointerUp() {
      setIsSelecting(false);
      tryMatch(selectionPath);
      setSelectionPath([]);
      startCellRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelecting, selectionPath, grid, placements, foundWords, onWordFound]);

  const selectionCellKeys = new Set(
    selectionPath.map((c) => `${c.row}-${c.col}`),
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <p id={instructionsId} className="text-xs text-zinc-500 dark:text-zinc-400">
        Drag across a word, or click/press Enter on the first letter then the
        last letter.
      </p>
      <div
        ref={gridRef}
        aria-label="Word search puzzle grid"
        aria-describedby={instructionsId}
        className="grid w-full max-w-[420px] touch-none gap-0.5 select-none"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {grid.map((row, rowIndex) =>
          row.map((symbol, colIndex) => {
            const key = `${rowIndex}-${colIndex}`;
            const isFound = foundCellKeys.has(key);
            const isSelected = selectionCellKeys.has(key);
            const isAnchored =
              anchorCell?.row === rowIndex && anchorCell?.col === colIndex;
            return (
              <button
                key={key}
                type="button"
                aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}: ${symbol}`}
                aria-pressed={isAnchored}
                data-row={rowIndex}
                data-col={colIndex}
                onPointerDown={() =>
                  handlePointerDown({ row: rowIndex, col: colIndex })
                }
                onClick={() => handleCellActivate({ row: rowIndex, col: colIndex })}
                className={`flex aspect-square min-w-0 items-center justify-center rounded border text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
                  isFound
                    ? "border-green-700 bg-green-700 text-white"
                    : isSelected || isAnchored
                      ? "border-amber-500 bg-amber-200 text-zinc-950 dark:border-amber-400 dark:bg-amber-900 dark:text-zinc-50"
                      : "border-zinc-300 text-zinc-950 dark:border-zinc-700 dark:text-zinc-50"
                }`}
              >
                {symbol}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
