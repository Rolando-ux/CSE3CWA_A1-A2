"use client";

import { useEffect, useRef, useState } from "react";
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

  const cols = grid[0]?.length ?? 0;

  function cellFromPoint(clientX: number, clientY: number): Cell | null {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const row = el?.dataset.row;
    const col = el?.dataset.col;
    if (row === undefined || col === undefined) return null;
    return { row: Number(row), col: Number(col) };
  }

  function handlePointerDown(cell: Cell) {
    startCellRef.current = cell;
    setIsSelecting(true);
    setSelectionPath([cell]);
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
      const path = selectionPath;
      if (path.length > 1) {
        const pathKey = cellSetKey(path);
        for (const placement of placements) {
          if (foundWords.has(placement.word)) continue;
          if (cellSetKey(placement.coords) === pathKey) {
            onWordFound(placement.word);
            break;
          }
        }
      }
      setSelectionPath([]);
      startCellRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isSelecting, selectionPath, grid, placements, foundWords, onWordFound]);

  const foundCellKeys = new Set(
    placements
      .filter((p) => foundWords.has(p.word))
      .flatMap((p) => p.coords.map((c) => `${c.row}-${c.col}`)),
  );
  const selectionCellKeys = new Set(
    selectionPath.map((c) => `${c.row}-${c.col}`),
  );

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label="Word search puzzle grid"
      className="inline-grid touch-none gap-0.5 select-none"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {grid.map((row, rowIndex) =>
        row.map((symbol, colIndex) => {
          const key = `${rowIndex}-${colIndex}`;
          const isFound = foundCellKeys.has(key);
          const isSelected = selectionCellKeys.has(key);
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              data-row={rowIndex}
              data-col={colIndex}
              onPointerDown={() =>
                handlePointerDown({ row: rowIndex, col: colIndex })
              }
              className={`flex h-9 w-9 items-center justify-center rounded border text-sm font-semibold transition-colors ${
                isFound
                  ? "border-green-600 bg-green-600 text-white dark:border-green-500 dark:bg-green-500"
                  : isSelected
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
  );
}
