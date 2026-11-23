// Canvas drawing for the Snake game (SPEC 09). Reads state, never changes it.

import { CELL, COLS, ROWS } from './constants';
import { FRUIT_ATLAS } from './atlas';
import type { SnakeState } from './types';

const BG = '#0a0a0f';
const GRID = 'rgba(0, 255, 136, 0.06)';
const GREEN = '#00ff88';
const GREEN_HEAD = '#b8ffd9';
const MAGENTA = '#ff006e';
const INK = '#e6e9ff';

export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: SnakeState,
  fruitImage: HTMLImageElement | null,
): void {
  const width = COLS * CELL;
  const height = ROWS * CELL;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < COLS; x++) {
    ctx.moveTo(x * CELL + 0.5, 0);
    ctx.lineTo(x * CELL + 0.5, height);
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.moveTo(0, y * CELL + 0.5);
    ctx.lineTo(width, y * CELL + 0.5);
  }
  ctx.stroke();

  drawFruit(ctx, state, fruitImage);
  drawSnake(ctx, state);

  if (state.status === 'paused') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = INK;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', width / 2, height / 2);
  }
}

function drawSnake(ctx: CanvasRenderingContext2D, state: SnakeState): void {
  const inset = 2;
  state.body.forEach((c, i) => {
    ctx.fillStyle = i === 0 ? GREEN_HEAD : GREEN;
    ctx.fillRect(c.x * CELL + inset, c.y * CELL + inset, CELL - inset * 2, CELL - inset * 2);
  });
}

function drawFruit(
  ctx: CanvasRenderingContext2D,
  state: SnakeState,
  fruitImage: HTMLImageElement | null,
): void {
  const { x, y, kind } = state.fruit;
  const cx = x * CELL + CELL / 2;
  const cy = y * CELL + CELL / 2;
  const sprite = FRUIT_ATLAS[kind];

  if (fruitImage === null || sprite === undefined) {
    ctx.fillStyle = MAGENTA;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * 0.35, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Fit the sprite inside the cell, keep its aspect ratio, and center it.
  const scale = CELL / Math.max(sprite.w, sprite.h);
  const dw = sprite.w * scale;
  const dh = sprite.h * scale;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    fruitImage,
    sprite.x,
    sprite.y,
    sprite.w,
    sprite.h,
    cx - dw / 2,
    cy - dh / 2,
    dw,
    dh,
  );
}
