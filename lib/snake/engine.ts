// Snake game rules (SPEC 09). Pure: no DOM, canvas, React or Next imports. State is never mutated.

import {
  COLS,
  DT_MAX,
  FRUIT_KINDS,
  FRUITS_PER_LEVEL,
  MAX_QUEUED_TURNS,
  MIN_INTERVAL,
  POINTS_PER_FRUIT,
  ROWS,
  SPEEDUP_PER_FRUIT,
  START_INTERVAL,
  START_LENGTH,
} from './constants';
import type { Cell, Dir, Fruit, SnakeInput, SnakeState } from './types';

export type Rng = () => number;

const VECTOR: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export function isOpposite(a: Dir, b: Dir): boolean {
  return OPPOSITE[a] === b;
}

// Wrap a coordinate into 0..max-1, so the snake reappears at the opposite edge.
export function wrap(value: number, max: number): number {
  return ((value % max) + max) % max;
}

export function level(fruits: number): number {
  return 1 + Math.floor(fruits / FRUITS_PER_LEVEL);
}

// Pick a random free cell and a random fruit kind. Returns null when the board is full.
export function spawnFruit(body: Cell[], rng: Rng = Math.random): Fruit | null {
  const taken = new Set(body.map((c) => c.y * COLS + c.x));
  const free: Cell[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!taken.has(y * COLS + x)) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;
  const cell = free[Math.min(free.length - 1, Math.floor(rng() * free.length))];
  const kind = Math.min(FRUIT_KINDS - 1, Math.floor(rng() * FRUIT_KINDS));
  return { x: cell.x, y: cell.y, kind };
}

export function createGame(rng: Rng = Math.random): SnakeState {
  const midX = Math.floor(COLS / 2);
  const midY = Math.floor(ROWS / 2);
  const body: Cell[] = [];
  for (let i = 0; i < START_LENGTH; i++) body.push({ x: midX - i, y: midY });
  const fruit = spawnFruit(body, rng);
  if (fruit === null) throw new Error('Snake: no free cell for the first fruit');
  return {
    status: 'playing',
    body,
    dir: 'right',
    queued: [],
    fruit,
    score: 0,
    fruits: 0,
    stepInterval: START_INTERVAL,
    acc: 0,
  };
}

// Pause or resume. A game over stays over.
export function setPaused(state: SnakeState, paused: boolean): SnakeState {
  if (state.status === 'gameover') return state;
  const status = paused ? 'paused' : 'playing';
  return status === state.status ? state : { ...state, status };
}

// Advance one frame. Input is ignored while the game is not playing.
export function step(
  state: SnakeState,
  input: SnakeInput,
  dt: number,
  rng: Rng = Math.random,
): SnakeState {
  if (state.status !== 'playing') return state;

  let queued = state.queued;
  if (input.turn !== null) {
    const last = queued.length > 0 ? queued[queued.length - 1] : state.dir;
    if (input.turn !== last && !isOpposite(last, input.turn) && queued.length < MAX_QUEUED_TURNS) {
      queued = [...queued, input.turn];
    }
  }

  const clamped = Math.max(0, Math.min(dt, DT_MAX));
  let cur: SnakeState = { ...state, queued, acc: state.acc + clamped };
  while (cur.status === 'playing' && cur.acc >= cur.stepInterval) {
    cur = moveOnce(cur, rng);
  }
  return cur;
}

// One grid move: turn, move the head, check the body, eat the fruit if it is there.
function moveOnce(state: SnakeState, rng: Rng): SnakeState {
  const interval = state.stepInterval;
  const dir = state.queued.length > 0 ? state.queued[0] : state.dir;
  const queued = state.queued.slice(state.queued.length > 0 ? 1 : 0);
  const head = state.body[0];
  const v = VECTOR[dir];
  const next: Cell = { x: wrap(head.x + v.x, COLS), y: wrap(head.y + v.y, ROWS) };
  const eating = next.x === state.fruit.x && next.y === state.fruit.y;

  // The tail leaves this step unless the snake eats, so it is not a collision.
  const solid = eating ? state.body : state.body.slice(0, -1);
  const bitten = solid.some((c) => c.x === next.x && c.y === next.y);
  if (bitten) {
    return { ...state, dir, queued, status: 'gameover', acc: state.acc - interval };
  }

  const body = eating ? [next, ...state.body] : [next, ...state.body.slice(0, -1)];
  if (!eating) {
    return { ...state, dir, queued, body, acc: state.acc - interval };
  }

  const fruits = state.fruits + 1;
  const stepInterval = Math.max(MIN_INTERVAL, interval - SPEEDUP_PER_FRUIT);
  const fruit = spawnFruit(body, rng);
  return {
    ...state,
    dir,
    queued,
    body,
    fruit: fruit ?? state.fruit,
    status: fruit === null ? 'gameover' : 'playing',
    score: state.score + POINTS_PER_FRUIT,
    fruits,
    stepInterval,
    acc: state.acc - interval,
  };
}
