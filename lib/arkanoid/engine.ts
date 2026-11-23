// Arkanoid game logic. Pure: no DOM, React, or Next imports (SPEC 08).
// Mechanics ported from references/started-games/04-arkanoid/game.js.
import {
  BALL_H,
  BALL_W,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCK_H,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  DT_MAX,
  EXPLOSION_DURATION,
  H,
  MAX_LEVEL,
  PADDLE_H,
  PADDLE_HIT_SLACK,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_Y,
  POINTS_PER_BRICK,
  START_LIVES,
  W,
} from './constants';
import { LEVELS } from './levels';
import type {
  ArkanoidInput,
  ArkanoidState,
  Ball,
  Brick,
  Explosion,
  Rect,
  SoundEvent,
} from './types';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Ball placed on the paddle, moving at the speed of the level.
function freshBall(paddle: Rect, level: number): Ball {
  const speed = LEVELS[level - 1].speed;
  return {
    x: paddle.x + (paddle.w - BALL_W) / 2,
    y: paddle.y - BALL_H,
    w: BALL_W,
    h: BALL_H,
    vx: BASE_BALL_VX * speed,
    vy: BASE_BALL_VY * speed,
  };
}

function bricksFor(level: number): Brick[] {
  return LEVELS[level - 1].blocks.map((b) => ({
    x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
    y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
    w: BLOCK_W,
    h: BLOCK_H,
    color: b.color,
    alive: true,
  }));
}

function collides(ball: Rect, brick: Rect): boolean {
  return (
    ball.x < brick.x + brick.w &&
    ball.x + ball.w > brick.x &&
    ball.y < brick.y + brick.h &&
    ball.y + ball.h > brick.y
  );
}

export function createGame(): ArkanoidState {
  const paddle: Rect = { x: (W - PADDLE_W) / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
  return {
    status: 'playing',
    level: 1,
    score: 0,
    lives: START_LIVES,
    paddle,
    ball: freshBall(paddle, 1),
    bricks: bricksFor(1),
    explosions: [],
    sounds: [],
  };
}

// Pauses or resumes a running game. A finished game stays finished.
export function setPaused(state: ArkanoidState, paused: boolean): ArkanoidState {
  if (state.status !== 'playing' && state.status !== 'paused') return state;
  const status = paused ? 'paused' : 'playing';
  return status === state.status ? state : { ...state, status };
}

// Advances the game by dt seconds (clamped to DT_MAX). Returns a new state.
// state.sounds holds only the sound events of this step.
export function step(state: ArkanoidState, input: ArkanoidInput, dt: number): ArkanoidState {
  if (state.status !== 'playing') {
    return state.sounds.length === 0 ? state : { ...state, sounds: [] };
  }

  const sounds: SoundEvent[] = [];
  const h = clamp(dt, 0, DT_MAX);

  // Paddle: keys move it, then the mouse position overrides it when present.
  let px = state.paddle.x;
  if (input.left) px = Math.max(0, px - PADDLE_SPEED * h);
  if (input.right) px = Math.min(W - state.paddle.w, px + PADDLE_SPEED * h);
  if (input.pointerX !== null) px = input.pointerX - state.paddle.w / 2;
  const paddle: Rect = { ...state.paddle, x: clamp(px, 0, W - state.paddle.w) };

  // Ball movement.
  let ball: Ball = {
    ...state.ball,
    x: state.ball.x + state.ball.vx * h,
    y: state.ball.y + state.ball.vy * h,
  };

  // Wall bounces: left, right, top.
  if (ball.x <= 0) {
    ball = { ...ball, x: 0, vx: Math.abs(ball.vx) };
    sounds.push('bounce');
  }
  if (ball.x + ball.w >= W) {
    ball = { ...ball, x: W - ball.w, vx: -Math.abs(ball.vx) };
    sounds.push('bounce');
  }
  if (ball.y <= 0) {
    ball = { ...ball, y: 0, vy: Math.abs(ball.vy) };
    sounds.push('bounce');
  }

  // Paddle bounce.
  if (
    ball.vy > 0 &&
    ball.x + ball.w > paddle.x &&
    ball.x < paddle.x + paddle.w &&
    ball.y + ball.h >= paddle.y &&
    ball.y + ball.h <= paddle.y + paddle.h + PADDLE_HIT_SLACK
  ) {
    ball = { ...ball, y: paddle.y - ball.h, vy: -Math.abs(ball.vy) };
    sounds.push('bounce');
  }

  // Brick hit: at most one brick per step, the first alive brick in order.
  let level = state.level;
  let score = state.score;
  let status = state.status as ArkanoidState['status'];
  let bricks = state.bricks;
  let explosions: Explosion[] = state.explosions;

  const hitIndex = bricks.findIndex((b) => b.alive && collides(ball, b));
  if (hitIndex >= 0) {
    const hit = bricks[hitIndex];
    bricks = bricks.map((b, i) => (i === hitIndex ? { ...b, alive: false } : b));
    explosions = [
      ...explosions,
      { x: hit.x, y: hit.y, w: hit.w, h: hit.h, color: hit.color, elapsed: 0 },
    ];
    score += POINTS_PER_BRICK;
    ball = { ...ball, vy: -ball.vy };
    sounds.push('break');

    if (bricks.every((b) => !b.alive)) {
      if (level < MAX_LEVEL) {
        // Next level: new bricks, explosions cleared, ball back on the paddle.
        level += 1;
        bricks = bricksFor(level);
        explosions = [];
        ball = freshBall(paddle, level);
      } else {
        status = 'won';
      }
    }
  }

  // Explosion animation.
  explosions = explosions
    .map((e) => ({ ...e, elapsed: e.elapsed + h * 1000 }))
    .filter((e) => e.elapsed < EXPLOSION_DURATION);

  // Ball lost: one life less. Game over at 0 lives, otherwise the ball is placed again.
  let lives = state.lives;
  if (status === 'playing' && ball.y > H) {
    lives -= 1;
    if (lives <= 0) {
      lives = 0;
      status = 'gameover';
    } else {
      ball = freshBall(paddle, level);
    }
  }

  return { ...state, status, level, score, lives, paddle, ball, bricks, explosions, sounds };
}
