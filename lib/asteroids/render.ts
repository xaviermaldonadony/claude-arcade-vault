// Canvas drawing for the asteroids game. Shapes follow references/started-games/02-asteroids/game.js.
// Colors come from skins.ts. Reads state only; does not change it. No React or Next imports.

import { BULLET_RADIUS, H, POWERUP_RADIUS, W } from './constants';
import { SKINS, type Skin, type SkinId } from './skins';
import type { AsteroidsState, Asteroid, Bullet, Particle, PowerUp, Ship } from './types';

// Neon glow for outlines and shots. Flat skins have glow 0. Callers wrap this in save and restore.
function setGlow(ctx: CanvasRenderingContext2D, color: string, skin: Skin): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = skin.glow;
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle, skin: Skin): void {
  const alpha = p.ttl / p.life;
  ctx.strokeStyle = `rgba(${skin.particle},${alpha.toFixed(2)})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
  ctx.stroke();
}

function drawAsteroid(ctx: CanvasRenderingContext2D, a: Asteroid, skin: Skin): void {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rot);
  ctx.strokeStyle = skin.line;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  setGlow(ctx, skin.line, skin);
  ctx.beginPath();
  ctx.moveTo(a.verts[0][0], a.verts[0][1]);
  for (let i = 1; i < a.verts.length; i++) ctx.lineTo(a.verts[i][0], a.verts[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

// Blinks in its last 2 seconds, as in the reference.
function drawPowerUp(ctx: CanvasRenderingContext2D, p: PowerUp, now: number, skin: Skin): void {
  if (p.ttl < 2 && Math.floor(p.ttl * 8) % 2 === 0) return;
  const pulse = 0.85 + Math.sin(now / 150) * 0.15;
  const r = POWERUP_RADIUS * pulse;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = skin.powerUp;
  ctx.lineWidth = 2;
  setGlow(ctx, skin.powerUp, skin);
  ctx.strokeRect(-r, -r, r * 2, r * 2);
  ctx.restore();
  ctx.fillStyle = skin.powerUp;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('3x', p.x, p.y);
}

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet, skin: Skin): void {
  ctx.save();
  ctx.fillStyle = skin.shot;
  setGlow(ctx, skin.shot, skin);
  if (skin.pixelShot) {
    // Retro: a flat square, the size of the dot.
    ctx.fillRect(b.x - BULLET_RADIUS, b.y - BULLET_RADIUS, BULLET_RADIUS * 2, BULLET_RADIUS * 2);
  } else {
    ctx.beginPath();
    ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Classic outline: nose, two wings, notched tail. Blinks while invincible.
function drawShip(ctx: CanvasRenderingContext2D, ship: Ship, skin: Skin): void {
  if (ship.invincible > 0 && Math.floor(ship.invincible * 8) % 2 === 0) return;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  ctx.strokeStyle = skin.ship;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  setGlow(ctx, skin.ship, skin);
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-12, -9);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-12, 9);
  ctx.closePath();
  ctx.stroke();

  // Thruster flame, flickering as in the reference.
  if (ship.thrusting && Math.random() > 0.35) {
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.lineTo(-8 - (6 + Math.random() * 8), 0);
    ctx.lineTo(-8, 4);
    ctx.strokeStyle = skin.thrust;
    ctx.stroke();
  }
  ctx.restore();
}

function drawLifeIcon(ctx: CanvasRenderingContext2D, x: number, y: number, skin: Skin): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = skin.ship;
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

function drawHUD(ctx: CanvasRenderingContext2D, state: AsteroidsState, skin: Skin): void {
  ctx.fillStyle = skin.hud;
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${state.score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`LEVEL ${state.level}`, W / 2, 26);

  for (let i = 0; i < state.lives; i++) drawLifeIcon(ctx, W - 16 - i * 22, 18, skin);

  if (state.ship.tripleShot > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = skin.powerUp;
    ctx.fillText(`3x  ${state.ship.tripleShot.toFixed(1)}s`, 14, 46);
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D, skin: Skin, title: string, sub: string): void {
  ctx.textAlign = 'center';
  ctx.fillStyle = skin.hud;
  ctx.font = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font = '18px monospace';
  ctx.fillStyle = skin.hudDim;
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

// Draw one frame. `now` is a millisecond timestamp, used only for the power-up pulse.
// `skinId` picks the palette from SKINS.
export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: AsteroidsState,
  now: number,
  skinId: SkinId,
): void {
  const skin = SKINS[skinId];
  ctx.fillStyle = skin.canvasBg;
  ctx.fillRect(0, 0, W, H);

  for (const p of state.particles) drawParticle(ctx, p, skin);
  for (const a of state.asteroids) drawAsteroid(ctx, a, skin);
  for (const p of state.powerUps) drawPowerUp(ctx, p, now, skin);
  for (const b of state.bullets) drawBullet(ctx, b, skin);

  // The ship is hidden while dead or in game over, as in the reference.
  if (state.status === 'playing' || state.status === 'paused') drawShip(ctx, state.ship, skin);

  drawHUD(ctx, state, skin);

  if (state.status === 'gameover') {
    drawOverlay(ctx, skin, 'GAME OVER', `FINAL SCORE: ${state.score}`);
  } else if (state.status === 'paused') {
    drawOverlay(ctx, skin, 'PAUSED', 'PRESS P OR ESC TO RESUME');
  }
}
