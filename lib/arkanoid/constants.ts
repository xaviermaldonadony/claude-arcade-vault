// Numbers ported from references/started-games/04-arkanoid/game.js and assets/spritesheet.js.
import type { BrickColor } from './types';

// Canvas, in pixels. Origin top-left.
export const W = 800;
export const H = 600;

// Max dt per frame, in seconds.
export const DT_MAX = 0.05;

// Paddle. Mouse and arrow keys move its center or its left edge (see engine.ts).
export const PADDLE_SPEED = 400; // px/s, keyboard
// Paddle speed when the D-pad drives it (SPEC 10). Faster, so a thumb press reaches its target in time.
export const TOUCH_PADDLE_SPEED = 720; // px/s
export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const PADDLE_Y = 560;
export const PADDLE_HIT_SLACK = 8; // the ball hits the paddle while within this many px below its top

// Ball.
export const BALL_W = 16;
export const BALL_H = 16;
export const BASE_BALL_VX = 200; // px/s, times the level speed
export const BASE_BALL_VY = -300; // px/s, times the level speed

// Brick grid.
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
export const BLOCKS_ORIGIN_Y = 80;

// Rules.
export const START_LIVES = 3;
export const MAX_LEVEL = 5;
export const POINTS_PER_BRICK = 10;

// Explosion animation, in milliseconds, split into 4 frames.
export const EXPLOSION_DURATION = 150;

// Source rectangles in assets/spritesheet-breakout.png (public/arkanoid/).
export type SpriteRect = { sx: number; sy: number; sw: number; sh: number };

export const SPRITE_PADDLE: SpriteRect = { sx: 32, sy: 112, sw: 162, sh: 14 };
export const SPRITE_BALL: SpriteRect = { sx: 32, sy: 32, sw: 16, sh: 16 };

export const SPRITE_BLOCK: Record<BrickColor, SpriteRect> = {
  gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
  red: { sx: 32, sy: 176, sw: 32, sh: 16 },
  yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
  cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
  magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
  hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
  green: { sx: 32, sy: 208, sw: 32, sh: 16 },
};

// Explosion row per color. The reference draws gray explosions with the red row.
const EXPLOSION_ROW_Y: Record<BrickColor, number> = {
  gray: 176,
  red: 176,
  cyan: 192,
  green: 208,
  magenta: 224,
  yellow: 240,
  hotpink: 256,
};

export const EXPLOSION_FRAMES: Record<BrickColor, SpriteRect[]> = Object.fromEntries(
  (Object.keys(EXPLOSION_ROW_Y) as BrickColor[]).map((color) => [
    color,
    [0, 1, 2, 3].map((i) => ({ sx: 256 + i * 32, sy: EXPLOSION_ROW_Y[color], sw: 32, sh: 16 })),
  ]),
) as Record<BrickColor, SpriteRect[]>;
