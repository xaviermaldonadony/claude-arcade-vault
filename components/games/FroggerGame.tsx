'use client';

import { useEffect, useRef, useState } from 'react';
import type { RealGameProps } from '@/lib/games-registry';
import type { TouchControls } from '@/lib/touch/controls';

// SPEC frogger-core (specs/game-jam/frogger/01-frogger-core.md), steps 2-7: constants, types, lane map,
// game loop, drawing, props, collision/support detection, landing and goals, round completion, and deaths.

const COLS = 16;
const ROWS = 14;
const CELL = 40; // px
const CANVAS_W = COLS * CELL; // 640 — scaled via CSS to the container
const CANVAS_H = ROWS * CELL; // 560

// Zones (row index, 0 = top)
const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID = 7;
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 12;
const ROW_START = 13;

type Direction = 'up' | 'down' | 'left' | 'right';

interface Lane {
  row: number;
  speed: number;
  dir: 1 | -1;
  entities: Entity[];
}

interface Entity {
  col: number;
  width: number;
  type: 'car' | 'truck' | 'log' | 'turtle';
  submerged?: boolean;
  phase?: number; // turtle cycle offset in ms
}

interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  targetCol: number;
  targetRow: number;
}

// Each level multiplies every lane speed by this factor (+15%).
const LEVEL_SPEED_STEP = 1.15;
// Road traffic runs at 70% of the spec speed, so the game is easier.
const ROAD_SPEED_EASE = 0.7;

interface Pattern {
  widths: number[];
  types: Entity['type'][];
  gap: number; // empty cells between entities
}

// Road: five lanes (rows 8-12). Gaps of 2+ cells keep the lanes crossable.
const ROAD_PATTERNS: Pattern[] = [
  { widths: [1, 2], types: ['car', 'car'], gap: 2 },
  { widths: [3], types: ['truck'], gap: 3 },
  { widths: [2, 1], types: ['car', 'car'], gap: 3 },
  { widths: [3], types: ['truck'], gap: 2 },
  { widths: [1], types: ['car'], gap: 3 },
];

// River: six lanes (rows 1-6). Each lane mixes logs (2-4 cells) and turtle groups (2-3 cells).
const RIVER_PATTERNS: Pattern[] = [
  { widths: [4, 2], types: ['log', 'turtle'], gap: 2 },
  { widths: [3, 3], types: ['turtle', 'log'], gap: 2 },
  { widths: [2, 4], types: ['turtle', 'log'], gap: 1 },
  { widths: [4, 3], types: ['log', 'turtle'], gap: 1 },
  { widths: [3, 2], types: ['log', 'turtle'], gap: 2 },
  { widths: [2, 4], types: ['turtle', 'log'], gap: 2 },
];

function fillLane(pattern: Pattern, startCol: number): Entity[] {
  const entities: Entity[] = [];
  let col = startCol;
  let i = 0;
  while (col < COLS) {
    const width = pattern.widths[i % pattern.widths.length];
    const type = pattern.types[i % pattern.types.length];
    entities.push({ col, width, type, phase: i * 1100 });
    col += width + pattern.gap;
    i++;
  }
  return entities;
}

// Builds all 11 lanes for a level. Road speeds 1.5-4 px/frame, river speeds 1-3 px/frame, both scaled by level.
export function buildLanes(level: number): Lane[] {
  const mult = Math.pow(LEVEL_SPEED_STEP, level - 1);
  const lanes: Lane[] = [];

  for (let i = 0; i <= ROW_ROAD_BOT - ROW_ROAD_TOP; i++) {
    lanes.push({
      row: ROW_ROAD_TOP + i,
      speed: (1.5 + (i % 3) * 1.25) * ROAD_SPEED_EASE * mult,
      dir: i % 2 === 0 ? 1 : -1,
      entities: fillLane(ROAD_PATTERNS[i], i * 2),
    });
  }

  for (let j = 0; j <= ROW_RIVER_BOT - ROW_RIVER_TOP; j++) {
    lanes.push({
      row: ROW_RIVER_TOP + j,
      speed: (1 + (j % 3)) * mult,
      dir: j % 2 === 0 ? 1 : -1,
      entities: fillLane(RIVER_PATTERNS[j], j),
    });
  }

  return lanes;
}

// ----- Step 4: timing, state, loop -----

const JUMP_MS = 120;
const FROG_START_COL = 7;
const BAY_COLS: [number, number][] = [
  [1, 2],
  [4, 5],
  [7, 8],
  [10, 11],
  [13, 14],
];
const TURTLE_CYCLE_MS = 4500;
const TURTLE_VISIBLE_MS = 3000; // visible, then 1500 ms underwater
const ROUND_MS_BASE = 25000; // easier: 25 s instead of 15 s
const ROUND_MS_STEP = 1000; // 1 s less per level
const ROUND_MS_MIN = 15000;
const CAR_COLORS = ['#d62828', '#f7c600', '#2a6fdb'];

function roundTime(level: number): number {
  return Math.max(ROUND_MS_MIN, ROUND_MS_BASE - (level - 1) * ROUND_MS_STEP);
}

function isSubmerged(e: Entity, clock: number): boolean {
  return (clock + (e.phase ?? 0)) % TURTLE_CYCLE_MS >= TURTLE_VISIBLE_MS;
}

interface GameState {
  lanes: Lane[];
  frog: Frog;
  pendingDir: Direction | null;
  timeLeft: number; // ms left in the round
  clock: number; // ms since start, drives turtle cycles
  score: number;
  lives: number;
  level: number;
  bays: boolean[];
  over: boolean;
  bestRow: number; // highest row reached this round, for the +10 advance bonus
}

function freshFrog(): Frog {
  return {
    col: FROG_START_COL,
    row: ROW_START,
    animating: false,
    animT: 0,
    targetCol: FROG_START_COL,
    targetRow: ROW_START,
  };
}

function createState(): GameState {
  return {
    lanes: buildLanes(1),
    frog: freshFrog(),
    pendingDir: null,
    timeLeft: roundTime(1),
    clock: 0,
    score: 0,
    lives: 3,
    level: 1,
    bays: BAY_COLS.map(() => false),
    over: false,
    bestRow: ROW_START,
  };
}

// Returns the target cell for a one-cell hop, or null when it would leave the board.
function hopTarget(frog: Frog, dir: Direction): { col: number; row: number } | null {
  // frog.col can be fractional while riding a log, so hop from the nearest cell.
  let col = Math.round(frog.col);
  let row = frog.row;
  if (dir === 'up') row -= 1;
  else if (dir === 'down') row += 1;
  else if (dir === 'left') col -= 1;
  else col += 1;
  if (col < 0 || col >= COLS || row < 0 || row > ROW_START) return null;
  return { col, row };
}

function updateState(s: GameState, dt: number) {
  s.clock += dt;

  // Lane entities: speeds are px/frame at 60 fps; positions are in cells.
  for (const lane of s.lanes) {
    const stepCells = (lane.speed * lane.dir * dt) / 16 / CELL;
    for (const e of lane.entities) {
      e.col += stepCells;
      if (lane.dir === 1 && e.col >= COLS) e.col = -e.width;
      else if (lane.dir === -1 && e.col + e.width <= 0) e.col = COLS;
      if (e.type === 'turtle') e.submerged = isSubmerged(e, s.clock);
    }
  }

  // Frog hop: 120 ms animation per cell, one queued direction at a time.
  const f = s.frog;
  if (f.animating) {
    f.animT += dt;
    if (f.animT >= JUMP_MS) {
      f.col = f.targetCol;
      f.row = f.targetRow;
      f.animating = false;
      f.animT = 0;
      resolveLanding(s);
    }
  }
  if (!f.animating && s.pendingDir) {
    const target = hopTarget(f, s.pendingDir);
    if (target) {
      f.animating = true;
      f.animT = 0;
      f.targetCol = target.col;
      f.targetRow = target.row;
    }
    s.pendingDir = null;
  }

  // Riding: a resting frog on the river moves with the entity under it.
  if (!f.animating && isRiverRow(f.row)) {
    const support = getSupport(f, s.lanes);
    if (support) f.col += (support.lane.speed * support.lane.dir * dt) / 16 / CELL;
  }

  s.timeLeft = Math.max(0, s.timeLeft - dt);
  checkDeaths(s);
}

// ----- Step 7: deaths and lives -----

// Loses one life and restarts the frog and the timer. On the last life the game is over.
function killFrog(s: GameState) {
  s.lives -= 1;
  if (s.lives <= 0) {
    s.lives = 0;
    s.over = true;
    return;
  }
  s.frog = freshFrog();
  s.pendingDir = null;
  s.timeLeft = roundTime(s.level);
}

// Death conditions: timeout, road vehicle, water, a submerged turtle under the frog, drifting off the river edges, a missed or taken bay.
function checkDeaths(s: GameState) {
  if (s.timeLeft <= 0) {
    killFrog(s);
    return;
  }
  const f = s.frog;
  if (f.animating) return;

  if (checkRoadCollision(f, s.lanes)) {
    killFrog(s);
    return;
  }
  if (isRiverRow(f.row)) {
    const drifted = f.col < -0.5 || f.col > COLS - 0.5;
    if (drifted || !getSupport(f, s.lanes)) {
      killFrog(s);
      return;
    }
  }
  if (checkGoal(f, s.bays)?.kind === 'death') {
    killFrog(s);
  }
}

// ----- Step 6: landing, goals, round completion -----

// Runs when a hop lands. Scores the first advance per row, fills bays, and ends the round when all are full.
// Deaths (vehicles, water, timeout, a missed or taken bay) are handled in step 7.
function resolveLanding(s: GameState) {
  const f = s.frog;
  if (f.row < s.bestRow) {
    s.score += 10 * (s.bestRow - f.row);
    s.bestRow = f.row;
  }

  const goal = checkGoal(f, s.bays);
  if (goal?.kind === 'reached') {
    s.bays[goal.bay] = true;
    s.score += 50 + Math.floor(s.timeLeft / 1000) * 10;
    if (s.bays.every(Boolean)) completeRound(s);
    else s.frog = freshFrog();
  }
}

function completeRound(s: GameState) {
  s.score += 200;
  s.level += 1;
  s.lanes = buildLanes(s.level);
  s.bays = BAY_COLS.map(() => false);
  s.frog = freshFrog();
  s.pendingDir = null;
  s.timeLeft = roundTime(s.level);
  s.bestRow = ROW_START;
}

// ----- Step 5: collision and support detection -----

function isRiverRow(row: number): boolean {
  return row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT;
}

// True when a vehicle occupies the frog's cell on a road row.
function checkRoadCollision(frog: Frog, lanes: Lane[]): boolean {
  return lanes.some(
    (lane) =>
      lane.row === frog.row &&
      lane.row >= ROW_ROAD_TOP &&
      lane.row <= ROW_ROAD_BOT &&
      lane.entities.some((e) => frog.col >= e.col && frog.col < e.col + e.width),
  );
}

// The river lane entity under the frog's cell, or null. A submerged turtle gives no support.
function getSupport(frog: Frog, lanes: Lane[]): { lane: Lane; entity: Entity } | null {
  if (!isRiverRow(frog.row)) return null;
  const lane = lanes.find((l) => l.row === frog.row);
  if (!lane) return null;
  const x = frog.col + 0.5; // frog centre, so a fractional position still resolves to one cell
  const entity = lane.entities.find((e) => x >= e.col && x < e.col + e.width);
  if (!entity) return null;
  if (entity.type === 'turtle' && entity.submerged) return null;
  return { lane, entity };
}

// On the goal row: 'reached' with the bay index, or 'death' when the frog misses a bay or enters a taken one.
// Null when the frog is not on the goal row.
type GoalResult = { kind: 'reached'; bay: number } | { kind: 'death' } | null;

function checkGoal(frog: Frog, bays: boolean[]): GoalResult {
  if (frog.row !== ROW_GOALS) return null;
  const bay = BAY_COLS.findIndex(([a, b]) => frog.col >= a && frog.col <= b);
  if (bay === -1 || bays[bay]) return { kind: 'death' };
  return { kind: 'reached', bay };
}

// ----- Step 4: drawing -----

function rowColor(row: number): string {
  if (row === ROW_GOALS) return '#06140a';
  if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT) return '#0a2a5c';
  if (row === ROW_SAFE_MID || row === ROW_START) return '#0d3b1a';
  return '#141414'; // road
}

function drawGoals(ctx: CanvasRenderingContext2D, s: GameState) {
  BAY_COLS.forEach(([a, b], i) => {
    const x = a * CELL;
    const w = (b - a + 1) * CELL;
    const y = 18;
    const h = 16;
    ctx.fillStyle = '#9be7a6';
    ctx.fillRect(x + 2, y, w - 4, h);
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y, w - 4, h);
    if (s.bays[i]) {
      ctx.fillStyle = '#1a7a2e';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawEntity(ctx: CanvasRenderingContext2D, lane: Lane, e: Entity, index: number) {
  const x = e.col * CELL;
  const y = lane.row * CELL + 6;
  const w = e.width * CELL;
  const h = CELL - 12;

  if (e.type === 'car') {
    ctx.fillStyle = CAR_COLORS[index % CAR_COLORS.length];
    ctx.fillRect(x + 3, y + 4, w - 6, h - 8);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x + 10, y + h - 2, 4, 0, Math.PI * 2);
    ctx.arc(x + w - 10, y + h - 2, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'truck') {
    ctx.fillStyle = '#8a8f98';
    ctx.fillRect(x + 3, y + 4, w - 6, h - 8);
    const cabX = lane.dir === 1 ? x + w - 16 : x + 3;
    ctx.fillStyle = '#4b4f57';
    ctx.fillRect(cabX, y + 8, 13, h - 16);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x + 10, y + h - 2, 4, 0, Math.PI * 2);
    ctx.arc(x + w - 10, y + h - 2, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'log') {
    ctx.fillStyle = '#7a4a1e';
    ctx.fillRect(x + 2, y + 6, w - 4, h - 12);
    ctx.strokeStyle = '#5c3513';
    ctx.lineWidth = 2;
    for (let lx = x + 10; lx < x + w - 4; lx += 12) {
      ctx.beginPath();
      ctx.moveTo(lx, y + 9);
      ctx.lineTo(lx, y + h - 9);
      ctx.stroke();
    }
  } else {
    // Turtle group: one turtle per cell.
    const cy = y + h / 2;
    for (let c = 0; c < e.width; c++) {
      const cx = x + c * CELL + CELL / 2;
      if (e.submerged) {
        ctx.strokeStyle = 'rgba(120, 220, 160, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, (CELL - 14) / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#2e9e55';
        ctx.beginPath();
        ctx.arc(cx, cy, (CELL - 14) / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e6b3a';
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawFrog(ctx: CanvasRenderingContext2D, f: Frog) {
  const t = f.animating ? Math.min(1, f.animT / JUMP_MS) : 0;
  const col = f.col + (f.targetCol - f.col) * t;
  const row = f.row + (f.targetRow - f.row) * t;
  const cx = col * CELL + CELL / 2;
  const cy = row * CELL + CELL / 2;

  if (f.animating) {
    ctx.strokeStyle = '#2e9e55';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 8);
    ctx.lineTo(cx - 16, cy - 14);
    ctx.moveTo(cx + 10, cy - 8);
    ctx.lineTo(cx + 16, cy - 14);
    ctx.moveTo(cx - 10, cy + 8);
    ctx.lineTo(cx - 16, cy + 14);
    ctx.moveTo(cx + 10, cy + 8);
    ctx.lineTo(cx + 16, cy + 14);
    ctx.stroke();
  }

  ctx.fillStyle = '#7cff4f';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 14, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx - 7, cy - 7, 4, 0, Math.PI * 2);
  ctx.arc(cx + 7, cy - 7, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx - 7, cy - 7, 2, 0, Math.PI * 2);
  ctx.arc(cx + 7, cy - 7, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawHud(ctx: CanvasRenderingContext2D, s: GameState) {
  ctx.font = '14px monospace';
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${s.score}`, 8, 15);

  ctx.textAlign = 'center';
  ctx.fillText(`LEVEL ${s.level}`, CANVAS_W / 2, 15);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#7cff4f';
  for (let i = 0; i < s.lives; i++) {
    ctx.beginPath();
    ctx.arc(CANVAS_W - 12 - i * 18, 10, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Time bar: bottom of row 0, below the bays.
  const total = roundTime(s.level);
  const frac = Math.max(0, Math.min(1, s.timeLeft / total));
  ctx.fillStyle = frac > 0.5 ? '#3cff5a' : frac > 0.25 ? '#ffe14d' : '#ff4d4d';
  ctx.fillRect(0, 36, CANVAS_W * frac, 4);
}

function drawState(ctx: CanvasRenderingContext2D, s: GameState) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  for (let row = 0; row < ROWS; row++) {
    ctx.fillStyle = rowColor(row);
    ctx.fillRect(0, row * CELL, CANVAS_W, CELL);
  }
  drawGoals(ctx, s);
  for (const lane of s.lanes) {
    lane.entities.forEach((e, i) => drawEntity(ctx, lane, e, i));
  }
  drawFrog(ctx, s.frog);
  drawHud(ctx, s);
}

// ----- Step 4: React component -----

export interface FroggerGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  // On-screen D-pad state from the player page (SPEC 10). Optional: keyboard only without it.
  touch?: TouchControls;
}

const KEY_DIRS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

export function FroggerGame(props: FroggerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(props.paused);
  const callbacksRef = useRef(props);

  useEffect(() => {
    pausedRef.current = props.paused;
    callbacksRef.current = props;
  }, [props]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    const s = createState();
    // Values last reported to the parent, so callbacks fire only on change.
    const reported = { score: 0, lives: 3, level: 1, over: false };

    const onKey = (e: KeyboardEvent) => {
      const dir = KEY_DIRS[e.key];
      if (!dir) return;
      e.preventDefault();
      if (pausedRef.current || s.over) return;
      s.pendingDir = dir;
    };
    document.addEventListener('keydown', onKey);

    let raf = 0;
    let last = 0;
    const frame = (now: number) => {
      const dt = last ? Math.min(50, now - last) : 16;
      last = now;

      if (!pausedRef.current && !s.over) {
        // A D-pad press is queued like a key press. Last one wins.
        const touch = callbacksRef.current.touch;
        if (touch) {
          for (const dir of ['up', 'down', 'left', 'right'] as const) {
            if (touch.takePress(dir)) s.pendingDir = dir;
          }
        }
        updateState(s, dt);
      }
      drawState(ctx, s);

      const cb = callbacksRef.current;
      if (s.score !== reported.score) {
        reported.score = s.score;
        cb.onScoreChange(s.score);
      }
      if (s.lives !== reported.lives) {
        reported.lives = s.lives;
        cb.onLivesChange(s.lives);
      }
      if (s.level !== reported.level) {
        reported.level = s.level;
        cb.onLevelChange(s.level);
      }
      // Lives reach 0 before the game ends, so onLivesChange(0) comes before onGameOver.
      if (s.over && !reported.over) {
        reported.over = true;
        cb.onGameOver(s.score);
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Frogger game board"
      style={{
        display: 'block',
        width: '100%',
        maxWidth: CANVAS_W,
        height: 'auto',
        aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
        imageRendering: 'pixelated',
      }}
    />
  );
}

// Registry adapter (lib/games-registry.ts): the same props as the other real games.
// Stats go up as one object, so the player's HUD gets score, level and lives together.
export function FroggerRealGame({ touch, paused, onStats, onEnd }: RealGameProps) {
  const [stats, setStats] = useState({ score: 0, level: 1, lives: 3 });

  useEffect(() => {
    onStats(stats);
  }, [stats, onStats]);

  return (
    <FroggerGame
      touch={touch}
      paused={paused}
      onScoreChange={(score) => setStats((s) => ({ ...s, score }))}
      onLivesChange={(lives) => setStats((s) => ({ ...s, lives }))}
      onLevelChange={(level) => setStats((s) => ({ ...s, level }))}
      onGameOver={onEnd}
    />
  );
}
