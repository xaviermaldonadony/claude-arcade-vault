// Canvas drawing for the asteroids game. Shapes follow references/started-games/02-asteroids/game.js.
// Reads state only; does not change it. No React or Next imports.

import { BULLET_RADIUS, H, POWERUP_RADIUS, W } from './constants';
import type { AsteroidsState, Asteroid, Bullet, Particle, PowerUp, Ship } from './types';

const WHITE = '#fff';
const CYAN = '#0ff';

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const alpha = p.ttl / p.life;
  ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
  ctx.stroke();
}

function drawAsteroid(ctx: CanvasRenderingContext2D, a: Asteroid): void {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rot);
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(a.verts[0][0], a.verts[0][1]);
  for (let i = 1; i < a.verts.length; i++) ctx.lineTo(a.verts[i][0], a.verts[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

// Blinks in its last 2 seconds, as in the reference.
function drawPowerUp(ctx: CanvasRenderingContext2D, p: PowerUp, now: number): void {
  if (p.ttl < 2 && Math.floor(p.ttl * 8) % 2 === 0) return;
  const pulse = 0.85 + Math.sin(now / 150) * 0.15;
  const r = POWERUP_RADIUS * pulse;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 2;
  ctx.strokeRect(-r, -r, r * 2, r * 2);
  ctx.restore();
  ctx.fillStyle = CYAN;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('3x', p.x, p.y);
}

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet): void {
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

// Classic outline: nose, two wings, notched tail. Blinks while invincible.
function drawShip(ctx: CanvasRenderingContext2D, ship: Ship): void {
  if (ship.invincible > 0 && Math.floor(ship.invincible * 8) % 2 === 0) return;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-12, -9);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-12, 9);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawLifeIcon(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-6, 5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD(ctx: CanvasRenderingContext2D, state: AsteroidsState): void {
  ctx.fillStyle = WHITE;
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${state.score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`LEVEL ${state.level}`, W / 2, 26);

  for (let i = 0; i < state.lives; i++) drawLifeIcon(ctx, W - 16 - i * 22, 18);

  if (state.ship.tripleShot > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = CYAN;
    ctx.fillText(`3x  ${state.ship.tripleShot.toFixed(1)}s`, 14, 46);
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D, title: string, sub: string): void {
  ctx.textAlign = 'center';
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font = '18px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

// Draw one frame. `now` is a millisecond timestamp, used only for the power-up pulse.
export function drawGame(ctx: CanvasRenderingContext2D, state: AsteroidsState, now: number): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  for (const p of state.particles) drawParticle(ctx, p);
  for (const a of state.asteroids) drawAsteroid(ctx, a);
  for (const p of state.powerUps) drawPowerUp(ctx, p, now);
  for (const b of state.bullets) drawBullet(ctx, b);

  // The ship is hidden while dead or in game over, as in the reference.
  if (state.status === 'playing' || state.status === 'paused') drawShip(ctx, state.ship);

  drawHUD(ctx, state);

  if (state.status === 'gameover') {
    drawOverlay(ctx, 'GAME OVER', `FINAL SCORE: ${state.score}`);
  } else if (state.status === 'paused') {
    drawOverlay(ctx, 'PAUSED', 'PRESS P OR ESC TO RESUME');
  }
}
