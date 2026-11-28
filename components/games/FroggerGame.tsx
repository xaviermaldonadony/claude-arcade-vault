'use client';

// SPEC frogger-core (specs/game-jam/frogger/01-frogger-core.md), steps 2-3: constants, local types, lane map.
// The game loop, drawing and props are added in later steps.

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
    entities.push({ col, width, type });
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
      speed: (1.5 + (i % 3) * 1.25) * mult,
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
