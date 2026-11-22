import {
  COLS,
  LINE_SCORES,
  MAX_DT,
  PIECES,
  ROTATE_KICKS,
  ROWS,
  dropIntervalFor,
} from './constants';
import type { Board, Piece, TetrisInput, TetrisState } from './types';

export type Rng = () => number;

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

function pieceShape(type: number): number[][] {
  const base = PIECES[type];
  if (!base) throw new Error(`Unknown piece type ${type}`);
  return base.map((row) => [...row]);
}

function randomPiece(rng: Rng): Piece {
  // Math.min guards against an rng that returns 1.
  const type = Math.min(7, Math.floor(rng() * 8)) + 1;
  const shape = pieceShape(type);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

function clonePiece(piece: Piece): Piece {
  return { ...piece, shape: piece.shape.map((row) => [...row]) };
}

function cloneState(state: TetrisState): TetrisState {
  return {
    ...state,
    board: state.board.map((row) => [...row]),
    current: clonePiece(state.current),
    next: clonePiece(state.next),
  };
}

export function collide(board: Board, shape: number[][], ox: number, oy: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

export function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array<number>(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

// Mutates state.current. Tries each kick in order and keeps the first that fits.
export function tryRotate(state: TetrisState): void {
  const rotated = rotateCW(state.current.shape);
  for (const kick of ROTATE_KICKS) {
    if (!collide(state.board, rotated, state.current.x + kick, state.current.y)) {
      state.current.shape = rotated;
      state.current.x += kick;
      return;
    }
  }
}

// Mutates state.board. Writes the current piece into the board.
export function merge(state: TetrisState): void {
  const { shape, x, y } = state.current;
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) state.board[y + r][x + c] = shape[r][c];
}

// Mutates state.board, lines, score, level and dropInterval. Returns the cleared count.
export function clearLines(state: TetrisState): number {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (state.board[r].every((v) => v !== 0)) {
      state.board.splice(r, 1);
      state.board.unshift(new Array<number>(COLS).fill(0));
      cleared++;
      r++; // check the same index again, as the reference does
    }
  }
  if (cleared) {
    state.lines += cleared;
    state.score += (LINE_SCORES[cleared] ?? 0) * state.level;
    state.level = Math.floor(state.lines / 10) + 1;
    state.dropInterval = dropIntervalFor(state.level);
  }
  return cleared;
}

export function ghostY(state: TetrisState): number {
  const { board, current } = state;
  let gy = current.y;
  while (!collide(board, current.shape, current.x, gy + 1)) gy++;
  return gy;
}

// Mutates state. Puts next into play and draws a new next. Ends the game if it cannot enter.
function spawn(state: TetrisState, rng: Rng): void {
  state.current = state.next;
  state.next = randomPiece(rng);
  if (collide(state.board, state.current.shape, state.current.x, state.current.y)) {
    state.status = 'gameover';
  }
}

function lockPiece(state: TetrisState, rng: Rng): void {
  merge(state);
  clearLines(state);
  spawn(state, rng);
}

function hardDrop(state: TetrisState, rng: Rng): void {
  const gy = ghostY(state);
  state.score += (gy - state.current.y) * 2;
  state.current.y = gy;
  lockPiece(state, rng);
}

function softDrop(state: TetrisState, rng: Rng): void {
  if (!collide(state.board, state.current.shape, state.current.x, state.current.y + 1)) {
    state.current.y += 1;
    state.score += 1;
  } else {
    lockPiece(state, rng);
  }
}

export function createGame(rng: Rng = Math.random): TetrisState {
  return {
    status: 'playing',
    board: emptyBoard(),
    current: randomPiece(rng),
    next: randomPiece(rng),
    score: 0,
    lines: 0,
    level: 1,
    dropAccum: 0,
    dropInterval: dropIntervalFor(1),
  };
}

// Paused does not change the timers. Game over cannot be resumed.
export function setPaused(state: TetrisState, paused: boolean): TetrisState {
  if (state.status === 'gameover') return state;
  return { ...state, status: paused ? 'paused' : 'playing' };
}

// One frame. Returns a new state and does not change the input state.
// Discrete inputs are applied once. softDrop is one cell per frame in which it is true,
// so the caller sends it once per OS key-repeat event, as the reference does.
export function step(
  state: TetrisState,
  input: TetrisInput,
  dt: number,
  rng: Rng = Math.random,
): TetrisState {
  if (state.status !== 'playing') return state;

  const next = cloneState(state);

  if (input.left && !collide(next.board, next.current.shape, next.current.x - 1, next.current.y)) {
    next.current.x -= 1;
  }
  if (input.right && !collide(next.board, next.current.shape, next.current.x + 1, next.current.y)) {
    next.current.x += 1;
  }
  if (input.rotate) tryRotate(next);

  if (input.hardDrop) {
    hardDrop(next, rng);
    if (next.status !== 'playing') return next;
  }
  if (input.softDrop) {
    softDrop(next, rng);
    if (next.status !== 'playing') return next;
  }

  const frame = Math.min(Math.max(dt, 0), MAX_DT);
  next.dropAccum += frame;
  if (next.dropAccum >= next.dropInterval) {
    next.dropAccum = 0;
    if (!collide(next.board, next.current.shape, next.current.x, next.current.y + 1)) {
      next.current.y += 1;
    } else {
      lockPiece(next, rng);
    }
  }
  return next;
}
