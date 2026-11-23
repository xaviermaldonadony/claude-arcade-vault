// The five levels, ported from references/started-games/04-arkanoid/levels.js. Pure data.
import type { BrickColor, LevelBlock, LevelDef } from './types';

const ROWS = 6;
const COLS = 10;

function fullGrid(rowColors: BrickColor[]): LevelBlock[] {
  const out: LevelBlock[] = [];
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++) out.push({ col, row, color: rowColors[row] });
  return out;
}

const rowColors1: BrickColor[] = ['red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green'];
const rowColors2: BrickColor[] = ['gray', 'cyan', 'hotpink', 'yellow', 'magenta', 'green'];
const rowColors4: BrickColor[] = ['cyan', 'magenta', 'green', 'yellow', 'hotpink', 'red'];

const pyStart = [4, 3, 2, 1, 0, 0];
const pyEnd = [5, 6, 7, 8, 9, 9];

const gaps4: number[][] = [
  [2, 5, 8],
  [0, 4, 7, 9],
  [1, 3, 6],
  [2, 5, 8, 9],
  [0, 4, 7],
  [1, 3, 6, 9],
];

export const LEVELS: readonly LevelDef[] = [
  { speed: 1.0, blocks: fullGrid(rowColors1) },
  {
    speed: 1.1,
    blocks: (() => {
      const out: LevelBlock[] = [];
      for (let row = 0; row < ROWS; row++)
        for (let col = pyStart[row]; col <= pyEnd[row]; col++)
          out.push({ col, row, color: rowColors2[row] });
      return out;
    })(),
  },
  {
    speed: 1.21,
    blocks: (() => {
      const out: LevelBlock[] = [];
      for (let row = 0; row < ROWS; row++)
        for (let col = 0; col < COLS; col++)
          if ((col + row) % 2 === 0) out.push({ col, row, color: row < 3 ? 'yellow' : 'magenta' });
      return out;
    })(),
  },
  {
    speed: 1.33,
    blocks: (() => {
      const out: LevelBlock[] = [];
      for (let row = 0; row < ROWS; row++)
        for (let col = 0; col < COLS; col++)
          if (!gaps4[row].includes(col)) out.push({ col, row, color: rowColors4[row] });
      return out;
    })(),
  },
  {
    speed: 1.46,
    blocks: (() => {
      const out: LevelBlock[] = [];
      for (let row = 0; row < ROWS; row++)
        for (let col = 0; col < COLS; col++) {
          const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
          const isCross = col === 4 || row === 2;
          if (isFrame || isCross)
            out.push({ col, row, color: isCross && !isFrame ? 'hotpink' : 'cyan' });
        }
      return out;
    })(),
  },
];
