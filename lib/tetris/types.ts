export type Cell = number; // 0 = empty, 1..8 = piece color index
export type Board = Cell[][]; // ROWS rows of COLS cells, row 0 at the top

export type Piece = {
  type: number; // 1..8, index into PIECES
  shape: number[][]; // square matrix of 0 or piece color index
  x: number; // column of the shape's top-left cell
  y: number; // row of the shape's top-left cell
};

export type TetrisStatus = 'playing' | 'paused' | 'gameover';

export type TetrisState = {
  status: TetrisStatus;
  board: Board;
  current: Piece;
  next: Piece;
  score: number;
  lines: number;
  level: number;
  dropAccum: number; // seconds since last gravity step
  dropInterval: number; // seconds between gravity steps
};

export type TetrisInput = {
  left: boolean; // justPressed
  right: boolean; // justPressed
  rotate: boolean; // justPressed, Up or X
  softDrop: boolean; // Down, repeats with OS key repeat
  hardDrop: boolean; // justPressed, Space
};
