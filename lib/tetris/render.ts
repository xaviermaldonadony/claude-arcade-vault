// Canvas drawing for the Tetris game. Reads state only; does not change it. No React or Next imports.

import { BLOCK, COLS, ROWS } from './constants';
import { ghostY } from './engine';
import { SKINS, type Skin, type SkinId } from './skins';
import type { TetrisState } from './types';

const WHITE = '#fff';

const BOARD_W = COLS * BLOCK;
const BOARD_H = ROWS * BLOCK;
// NEXT panel: 120 by 120, to the right of the board, top aligned. Cells are BLOCK px, a 4 by 4 grid.
const NEXT_X = BOARD_W;
const NEXT_Y = 0;
const NEXT_CELLS = 4;

// (px, py) is the top-left of the cell in canvas pixels.
function drawBlock(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  px: number,
  py: number,
  size: number,
  value: number,
  alpha: number,
): void {
  if (!value) return;
  const color = skin.colors[value];
  if (!color) return;
  ctx.globalAlpha = alpha;
  skin.drawCell(ctx, px + 1, py + 1, size - 2, color);
  ctx.globalAlpha = 1;
}

function drawShapeOnBoard(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  shape: number[][],
  col: number,
  row: number,
  alpha: number,
): void {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(ctx, skin, (col + c) * BLOCK, (row + r) * BLOCK, BLOCK, shape[r][c], alpha);
}

function drawNext(ctx: CanvasRenderingContext2D, skin: Skin, shape: number[][]): void {
  const offX = Math.floor((NEXT_CELLS - shape[0].length) / 2);
  const offY = Math.floor((NEXT_CELLS - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(
        ctx,
        skin,
        NEXT_X + (offX + c) * BLOCK,
        NEXT_Y + (offY + r) * BLOCK,
        BLOCK,
        shape[r][c],
        1,
      );
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
// Expects a canvas of BOARD_W + 120 by BOARD_H pixels (420 by 600).
export function drawTetris(
  ctx: CanvasRenderingContext2D,
  state: TetrisState,
  _now: number,
  skinId: SkinId,
): void {
  const skin = SKINS[skinId];

  ctx.fillStyle = skin.canvasBg;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawGrid(ctx, skin);

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, skin, c * BLOCK, r * BLOCK, BLOCK, state.board[r][c], 1);

  const { current } = state;
  drawShapeOnBoard(ctx, skin, current.shape, current.x, ghostY(state), skin.ghostAlpha);
  drawShapeOnBoard(ctx, skin, current.shape, current.x, current.y, 1);

  drawNext(ctx, skin, state.next.shape);

  if (state.status === 'gameover') {
    drawOverlay(ctx, 'GAME OVER', `FINAL SCORE: ${state.score}`);
  } else if (state.status === 'paused') {
    drawOverlay(ctx, 'PAUSED', 'PRESS P OR ESC TO RESUME');
  }
}
