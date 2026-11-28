// Canvas drawing for the arkanoid game. Sprites come from public/arkanoid/spritesheet-breakout.png.
// Reads state only; does not change it. No React or Next imports.
// Layout follows references/started-games/04-arkanoid/game.js. Skins are in ./skins.ts.

import {
  EXPLOSION_DURATION,
  EXPLOSION_FRAMES,
  H,
  SPRITE_BALL,
  SPRITE_BLOCK,
  SPRITE_PADDLE,
  W,
  type SpriteRect,
} from './constants';
import { SKINS, type SkinId, type SheetTint, type Skin } from './skins';
import type { ArkanoidState, Rect } from './types';

// Loads the sprite sheet. Resolves only when the image is ready to draw.
export function loadSprites(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load sprite sheet: ${src}`));
    img.src = src;
  });
}

// Tinted copies of the sheet, built once per sheet and tint. Keyed by the image, so a reload gets new copies.
const tintedSheets = new WeakMap<HTMLImageElement, Partial<Record<SheetTint, HTMLCanvasElement>>>();

// Retro tint: pull the colors 60% toward gray, then warm them with a cream multiply.
// Each step is clipped back to the sprite alpha, so the transparent areas stay empty.
function buildRetroSheet(sheet: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = sheet.naturalWidth;
  canvas.height = sheet.naturalHeight;
  const t = canvas.getContext('2d');
  if (!t) return canvas;
  t.drawImage(sheet, 0, 0);
  t.globalCompositeOperation = 'saturation';
  t.globalAlpha = 0.6;
  t.fillStyle = '#808080';
  t.fillRect(0, 0, canvas.width, canvas.height);
  t.globalCompositeOperation = 'multiply';
  t.globalAlpha = 1;
  t.fillStyle = '#f0dcb4';
  t.fillRect(0, 0, canvas.width, canvas.height);
  t.globalCompositeOperation = 'destination-in';
  t.drawImage(sheet, 0, 0);
  return canvas;
}

function sheetFor(sheet: HTMLImageElement, tint: SheetTint): CanvasImageSource {
  if (tint === 'none') return sheet;
  let byTint = tintedSheets.get(sheet);
  if (!byTint) {
    byTint = {};
    tintedSheets.set(sheet, byTint);
  }
  let canvas = byTint[tint];
  if (!canvas) {
    canvas = buildRetroSheet(sheet);
    byTint[tint] = canvas;
  }
  return canvas;
}

// Glow halos: only the shadow of one sprite, drawn once per source, sprite rect, size, blur and color.
// The sprite is drawn off the halo canvas by HALO_OFFSET, so only its shadow lands inside it.
// The halo has a margin of `glow` px on each side, so the blur is not cut off.
const HALO_OFFSET = 4096;
const glowHalos = new WeakMap<CanvasImageSource, Map<string, HTMLCanvasElement>>();

function glowHalo(
  source: CanvasImageSource,
  s: SpriteRect,
  w: number,
  h: number,
  glow: number,
  glowColor: string,
): HTMLCanvasElement {
  let bySize = glowHalos.get(source);
  if (!bySize) {
    bySize = new Map();
    glowHalos.set(source, bySize);
  }
  const key = `${glow}|${glowColor}|${s.sx},${s.sy},${s.sw},${s.sh}|${w}x${h}`;
  let canvas = bySize.get(key);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w + glow * 2);
    canvas.height = Math.ceil(h + glow * 2);
    const hc = canvas.getContext('2d');
    if (hc) {
      hc.shadowBlur = glow;
      hc.shadowColor = glowColor;
      hc.shadowOffsetX = HALO_OFFSET;
      hc.drawImage(source, s.sx, s.sy, s.sw, s.sh, glow - HALO_OFFSET, glow, w, h);
    }
    bySize.set(key, canvas);
  }
  return canvas;
}

// Glow is a shadow in the given color. glow 0 draws flat.
// The glow is a cached halo drawn under the sprite, the same pixels as a shadowBlur draw.
function drawSprite(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  s: SpriteRect,
  r: Rect,
  glow = 0,
  glowColor = '#000',
): void {
  if (glow > 0) {
    const halo = glowHalo(source, s, r.w, r.h, glow, glowColor);
    ctx.drawImage(halo, r.x - glow, r.y - glow);
  }
  ctx.drawImage(source, s.sx, s.sy, s.sw, s.sh, r.x, r.y, r.w, r.h);
}

function drawOverlay(ctx: CanvasRenderingContext2D, skin: Skin, message: string): void {
  ctx.fillStyle = skin.scrimGameOver;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = skin.overlayTitle;
  ctx.font = 'bold 64px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, W / 2, H / 2);
}

function drawPauseOverlay(ctx: CanvasRenderingContext2D, skin: Skin): void {
  ctx.fillStyle = skin.scrimPause;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = skin.overlayTitle;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 56px monospace';
  ctx.fillText('PAUSED', W / 2, H / 2 - 20);
  ctx.fillStyle = skin.hudDim;
  ctx.font = 'bold 16px monospace';
  ctx.fillText('Press P or Esc to resume', W / 2, H / 2 + 30);
}

function drawHud(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  skin: Skin,
  state: ArkanoidState,
): void {
  ctx.fillStyle = skin.hud;
  ctx.font = 'bold 18px monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${state.score}`, 10, 10);
  ctx.textAlign = 'center';
  ctx.fillText(`Level: ${state.level}`, W / 2, 10);

  // Lives as small balls, top right, as in the reference.
  const size = 16;
  const spacing = 4;
  for (let i = 0; i < state.lives; i++) {
    const x = W - 10 - (state.lives - i) * (size + spacing);
    drawSprite(ctx, source, SPRITE_BALL, { x, y: 10, w: size, h: size });
  }
}

// Draws one frame. The sprite sheet must already be loaded (see loadSprites).
export function drawGame(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  state: ArkanoidState,
  skinId: SkinId = 'classic',
): void {
  const skin = SKINS[skinId];
  const source = sheetFor(sheet, skin.sheetTint);

  ctx.fillStyle = skin.canvasBg;
  ctx.fillRect(0, 0, W, H);

  for (const brick of state.bricks) {
    if (brick.alive)
      drawSprite(
        ctx,
        source,
        SPRITE_BLOCK[brick.color],
        brick,
        skin.glow,
        skin.brickGlow[brick.color],
      );
  }

  for (const e of state.explosions) {
    const frames = EXPLOSION_FRAMES[e.color];
    const index = Math.min(
      Math.floor((e.elapsed / EXPLOSION_DURATION) * frames.length),
      frames.length - 1,
    );
    drawSprite(ctx, source, frames[index], e);
  }

  drawSprite(ctx, source, SPRITE_PADDLE, state.paddle, skin.glow, skin.paddleGlow);
  drawSprite(ctx, source, SPRITE_BALL, state.ball, skin.glow, skin.ballGlow);

  if (state.status === 'playing' || state.status === 'paused') drawHud(ctx, source, skin, state);
  if (state.status === 'gameover') drawOverlay(ctx, skin, 'GAME OVER');
  if (state.status === 'won') drawOverlay(ctx, skin, 'YOU CLEARED ALL LEVELS!');
  if (state.status === 'paused') drawPauseOverlay(ctx, skin);
}
