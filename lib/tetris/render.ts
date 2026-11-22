// Canvas drawing for the Tetris game. Reads state only; does not change it. No React or Next imports.

import { BLOCK, COLS, ROWS } from './constants';
import { ghostY } from './engine';
import { SKINS, type Skin, type SkinId } from './skins';
import type { TetrisState } from './types';

const WHITE = '#fff';

const BOARD_W = COLS * BLOCK;
const BOARD_H = ROWS * BLOCK;

function drawBlock(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  x: number,
  y: number,
  value: number,
  alpha: number,
): void {
  if (!value) return;
  const color = skin.colors[value];
  if (!color) return;
  ctx.globalAlpha = alpha;
  skin.drawCell(ctx, x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, color);
  ctx.globalAlpha = 1;
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  shape: number[][],
  ox: number,
  oy: number,
  alpha: number,
): void {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) drawBlock(ctx, skin, ox + c, oy + r, shape[r][c], alpha);
}

function drawGrid(ctx: CanvasRenderingContext2D, skin: Skin): void {
  ctx.strokeStyle = skin.grid;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, BOARD_H);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(BOARD_W, r * BLOCK);
    ctx.stroke();
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D, title: string, sub: string): void {
  ctx.textAlign = 'center';
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 40px monospace';
  ctx.fillText(title, BOARD_W / 2, BOARD_H / 2 - 16);
  ctx.font = '16px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, BOARD_W / 2, BOARD_H / 2 + 20);
}

// Draw one frame in the given skin. `_now` is unused: Tetris has no timed visuals.
export function drawTetris(
  ctx: CanvasRenderingContext2D,
  state: TetrisState,
  _now: number,
  skinId: SkinId,
): void {
  const skin = SKINS[skinId];

  ctx.fillStyle = skin.canvasBg;
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  drawGrid(ctx, skin);

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) drawBlock(ctx, skin, c, r, state.board[r][c], 1);

  const { current } = state;
  drawShape(ctx, skin, current.shape, current.x, ghostY(state), skin.ghostAlpha);
  drawShape(ctx, skin, current.shape, current.x, current.y, 1);

  if (state.status === 'gameover') {
    drawOverlay(ctx, 'GAME OVER', `FINAL SCORE: ${state.score}`);
  } else if (state.status === 'paused') {
    drawOverlay(ctx, 'PAUSED', 'PRESS P OR ESC TO RESUME');
  }
}
