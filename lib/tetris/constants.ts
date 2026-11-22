export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;

// Index 0 is unused. Piece colors are indexes 1..8.
export const COLORS: readonly (string | null)[] = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
  '#9e9e9e', // N - nut (gray)
];

// Index 0 is unused. Piece types are indexes 1..8.
export const PIECES: readonly (readonly (readonly number[])[] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (nut)
];

// Points indexed by lines cleared at once, multiplied by level.
export const LINE_SCORES = [0, 100, 300, 500, 800] as const;

// Horizontal offsets tried after a rotation, in order.
export const ROTATE_KICKS = [0, -1, 1, -2, 2] as const;

// Largest dt, in seconds, the engine accepts per frame.
export const MAX_DT = 0.05;

// Seconds between gravity steps for a level. Floor 100 ms.
export function dropIntervalFor(level: number): number {
  return Math.max(100, 1000 - (level - 1) * 90) / 1000;
}
