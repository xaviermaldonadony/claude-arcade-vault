// Snake game constants (SPEC 09). Tune numbers here, not in the engine.

export const COLS = 24;
export const ROWS = 24;
export const CELL = 24; // pixels per cell, so the canvas is COLS * CELL by ROWS * CELL

export const START_LENGTH = 3;
export const START_INTERVAL = 0.15; // seconds per step at the start
export const MIN_INTERVAL = 0.06; // fastest step, seconds
export const SPEEDUP_PER_FRUIT = 0.004; // seconds removed from the step on every bite

export const POINTS_PER_FRUIT = 10;
export const FRUITS_PER_LEVEL = 5; // HUD level = 1 + floor(fruits / FRUITS_PER_LEVEL); display only

export const FRUIT_KINDS = 22; // must match FRUIT_ATLAS.length in lib/snake/atlas.ts
export const MAX_QUEUED_TURNS = 2;
export const DT_MAX = 0.05; // seconds; dt is clamped to this per frame
