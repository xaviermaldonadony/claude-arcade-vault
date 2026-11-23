'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { H, W } from '@/lib/arkanoid/constants';
import { createGame, setPaused, step } from '@/lib/arkanoid/engine';
import { attachKeyboard } from '@/lib/arkanoid/input';
import { drawGame, loadSprites } from '@/lib/arkanoid/render';
import type { ArkanoidState } from '@/lib/arkanoid/types';

const SPRITE_SHEET_SRC = '/arkanoid/spritesheet-breakout.png';
const REBOUND_SRC = '/arkanoid/sounds/rebound.mp3';
const DESTROY_SRC = '/arkanoid/sounds/destroy.mp3';

const COARSE_QUERY = '(pointer: coarse)';

function subscribeCoarse(onChange: () => void): () => void {
  const mq = window.matchMedia(COARSE_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

const readCoarse = (): boolean => window.matchMedia(COARSE_QUERY).matches;
// Server render assumes a fine pointer, so hydration matches and the note appears only on the client.
const serverCoarse = (): boolean => false;

type Props = {
  // Controlled by the player. true pauses the engine, false resumes it.
  paused: boolean;
  // Called when score, lives, or level change.
  onStats: (stats: { score: number; lives: number; level: number }) => void;
  // Called once at game over or after the last level is cleared, with the final score.
  onEnd: (score: number) => void;
  // Called when P or Escape is pressed, so the player can toggle its paused state.
  onTogglePause?: () => void;
};

// Plays a fresh copy so overlapping sounds do not cut each other off.
// Browsers may refuse playback before a user gesture; that error is ignored.
function playCopy(source: HTMLAudioElement): void {
  const copy = source.cloneNode() as HTMLAudioElement;
  copy.play().catch(() => {});
}

export function ArkanoidGame({ paused, onStats, onEnd, onTogglePause }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Coarse pointer means a touch device. Touch controls are out of scope.
  const needsKeyboard = useSyncExternalStore(subscribeCoarse, readCoarse, serverCoarse);

  // Latest props, read by the frame loop without restarting it.
  const pausedRef = useRef(paused);
  const onStatsRef = useRef(onStats);
  const onEndRef = useRef(onEnd);
  const onTogglePauseRef = useRef(onTogglePause);
  useEffect(() => {
    pausedRef.current = paused;
    onStatsRef.current = onStats;
    onEndRef.current = onEnd;
    onTogglePauseRef.current = onTogglePause;
  }, [paused, onStats, onEnd, onTogglePause]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const keyboard = attachKeyboard(window);
    let state: ArkanoidState = createGame();
    let sheet: HTMLImageElement | null = null;
    let cancelled = false;
    let frameId = 0;
    let lastTs: number | null = null;
    let lastScore = -1;
    let lastLives = -1;
    let lastLevel = -1;
    let ended = false;

    // Mouse x in canvas coordinates. Set on mousemove, sent with the next frame only,
    // so the keys keep working while the mouse rests over the canvas.
    let pointerX: number | null = null;
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = (e.clientX - rect.left) * (canvas.width / rect.width);
    };
    canvas.addEventListener('mousemove', onMouseMove);

    const rebound = new Audio(REBOUND_SRC);
    const destroy = new Audio(DESTROY_SRC);

    const frame = (ts: number) => {
      if (!sheet) return;
      const dt = lastTs === null ? 0 : (ts - lastTs) / 1000;
      lastTs = ts;

      if (keyboard.takePausePress()) onTogglePauseRef.current?.();

      state = setPaused(state, pausedRef.current);
      const input = { ...keyboard.read(), pointerX };
      pointerX = null;
      state = step(state, input, dt);

      for (const sound of state.sounds) playCopy(sound === 'break' ? destroy : rebound);

      if (state.score !== lastScore || state.lives !== lastLives || state.level !== lastLevel) {
        lastScore = state.score;
        lastLives = state.lives;
        lastLevel = state.level;
        onStatsRef.current({ score: state.score, lives: state.lives, level: state.level });
      }
      if ((state.status === 'gameover' || state.status === 'won') && !ended) {
        ended = true;
        onEndRef.current(state.score);
      }

      drawGame(ctx, sheet, state);
      frameId = requestAnimationFrame(frame);
    };

    // The loop starts only after the sprite sheet is ready, so the first draw never fails.
    loadSprites(SPRITE_SHEET_SRC)
      .then((img) => {
        if (cancelled) return;
        sheet = img;
        frameId = requestAnimationFrame(frame);
      })
      .catch((err: unknown) => console.error(err));

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      canvas.removeEventListener('mousemove', onMouseMove);
      keyboard.detach();
    };
  }, []);

  // Fills the parent (the CRT screen arena). The canvas keeps its 4:3 ratio inside it.
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        aria-label="Arkanoid game field"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          background: '#000',
        }}
      />
      {needsKeyboard && (
        <p
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 12,
            margin: 0,
            textAlign: 'center',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '0.16em',
            color: 'var(--ink-dim)',
          }}
        >
          THIS GAME NEEDS A KEYBOARD
        </p>
      )}
    </div>
  );
}
