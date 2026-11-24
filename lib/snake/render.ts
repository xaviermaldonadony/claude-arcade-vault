// Canvas drawing for the Snake game (SPEC 09). Reads state, never changes it.

import { CELL, COLS, ROWS } from './constants';
import { FRUIT_ATLAS, type FruitSprite } from './atlas';
import { SKINS, type Skin, type SkinId } from './skins';
import type { SnakeState } from './types';

export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: SnakeState,
  fruitImage: HTMLImageElement | null,
  skinId: SkinId,
): void {
  const skin = SKINS[skinId];
  const width = COLS * CELL;
  const height = ROWS * CELL;

  ctx.fillStyle = skin.canvasBg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = skin.grid;
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

  drawFruit(ctx, state, fruitImage, skin);
  drawSnake(ctx, state, skin);

  if (state.status === 'paused') {
    ctx.fillStyle = skin.hudDim;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = skin.hud;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', width / 2, height / 2);
  }
}

function drawSnake(ctx: CanvasRenderingContext2D, state: SnakeState, skin: Skin): void {
  const inset = 2;
  const size = CELL - inset * 2;
  ctx.save();
  state.body.forEach((c, i) => {
    const color = i === 0 ? skin.head : skin.body;
    const px = c.x * CELL + inset;
    const py = c.y * CELL + inset;
    if (skin.glow > 0) {
      ctx.shadowColor = color;
      ctx.shadowBlur = skin.glow;
    }
    ctx.fillStyle = color;
    ctx.fillRect(px, py, size, size);
    if (skin.shade !== null) {
      // Flat pixel bevel: a 2 px shade along the bottom and right edges.
      ctx.shadowBlur = 0;
      ctx.fillStyle = skin.shade;
      ctx.fillRect(px, py + size - 2, size, 2);
      ctx.fillRect(px + size - 2, py, 2, size);
    }
  });
  ctx.restore();
}

function drawFruit(
  ctx: CanvasRenderingContext2D,
  state: SnakeState,
  fruitImage: HTMLImageElement | null,
  skin: Skin,
): void {
  const { x, y, kind } = state.fruit;
  const cx = x * CELL + CELL / 2;
  const cy = y * CELL + CELL / 2;
  const sprite = FRUIT_ATLAS[kind];

  ctx.save();
  if (skin.glow > 0) {
    ctx.shadowColor = skin.glowColor;
    ctx.shadowBlur = skin.glow;
  }

  if (fruitImage === null || sprite === undefined) {
    ctx.fillStyle = skin.fallback;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Fit the sprite inside the cell, keep its aspect ratio, and center it.
  const scale = CELL / Math.max(sprite.w, sprite.h);
  const dw = sprite.w * scale;
  const dh = sprite.h * scale;
  ctx.imageSmoothingEnabled = false;
  const tinted = skin.fruitTint === null ? null : tintSprite(fruitImage, sprite, skin.fruitTint);
  if (tinted) {
    // The silhouette canvas holds only this sprite, so it draws from the origin.
    ctx.drawImage(tinted, 0, 0, sprite.w, sprite.h, cx - dw / 2, cy - dh / 2, dw, dh);
  } else {
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
  ctx.restore();
}

// Scratch canvas for the one-color fruit silhouette. Reused, so no allocation per frame beyond resize.
let tintCanvas: HTMLCanvasElement | null = null;

// Paints the sprite's shape in one color: draw the sprite, then fill only where it is opaque.
// Returns null when no 2D context is available, and the caller draws the full-color sprite.
function tintSprite(
  image: HTMLImageElement,
  sprite: FruitSprite,
  color: string,
): HTMLCanvasElement | null {
  if (!tintCanvas) tintCanvas = document.createElement('canvas');
  tintCanvas.width = sprite.w;
  tintCanvas.height = sprite.h;
  const t = tintCanvas.getContext('2d');
  if (!t) return null;
  t.clearRect(0, 0, sprite.w, sprite.h);
  t.drawImage(image, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, sprite.w, sprite.h);
  t.globalCompositeOperation = 'source-in';
  t.fillStyle = color;
  t.fillRect(0, 0, sprite.w, sprite.h);
  return tintCanvas;
}
