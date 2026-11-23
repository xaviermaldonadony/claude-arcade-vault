// Canvas drawing for the arkanoid game. Sprites come from public/arkanoid/spritesheet-breakout.png.
// Reads state only; does not change it. No React or Next imports.
// Layout follows references/started-games/04-arkanoid/game.js.

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

function drawSprite(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  s: SpriteRect,
  r: Rect,
): void {
  ctx.drawImage(sheet, s.sx, s.sy, s.sw, s.sh, r.x, r.y, r.w, r.h);
}

function drawOverlay(ctx: CanvasRenderingContext2D, message: string): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 64px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, W / 2, H / 2);
}

function drawPauseOverlay(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 56px monospace';
  ctx.fillText('PAUSED', W / 2, H / 2 - 20);
  ctx.font = 'bold 16px monospace';
  ctx.fillText('Press P or Esc to resume', W / 2, H / 2 + 30);
}

function drawHud(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  state: ArkanoidState,
): void {
  ctx.fillStyle = '#fff';
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
    drawSprite(ctx, sheet, SPRITE_BALL, { x, y: 10, w: size, h: size });
  }
}

// Draws one frame. The sprite sheet must already be loaded (see loadSprites).
export function drawGame(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  state: ArkanoidState,
): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  for (const brick of state.bricks) {
    if (brick.alive) drawSprite(ctx, sheet, SPRITE_BLOCK[brick.color], brick);
  }

  for (const e of state.explosions) {
    const frames = EXPLOSION_FRAMES[e.color];
    const index = Math.min(
      Math.floor((e.elapsed / EXPLOSION_DURATION) * frames.length),
      frames.length - 1,
    );
    drawSprite(ctx, sheet, frames[index], e);
  }

  drawSprite(ctx, sheet, SPRITE_PADDLE, state.paddle);
  drawSprite(ctx, sheet, SPRITE_BALL, state.ball);

  if (state.status === 'playing' || state.status === 'paused') drawHud(ctx, sheet, state);
  if (state.status === 'gameover') drawOverlay(ctx, 'GAME OVER');
  if (state.status === 'won') drawOverlay(ctx, 'YOU CLEARED ALL LEVELS!');
  if (state.status === 'paused') drawPauseOverlay(ctx);
}
