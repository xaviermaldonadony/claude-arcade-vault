'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { attachKeyboard } from '@/lib/asteroids/input';
import { createGame, setPaused, step } from '@/lib/asteroids/engine';
import { drawGame } from '@/lib/asteroids/render';
import type { AsteroidsState } from '@/lib/asteroids/types';
import { H, W } from '@/lib/asteroids/constants';

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
  // Called once when the game reaches game over, with the final score.
  onEnd: (score: number) => void;
  // Called when P or Escape is pressed, so the player can toggle its paused state.
  onTogglePause?: () => void;
};

export function AsteroidsGame({ paused, onStats, onEnd, onTogglePause }: Props) {
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
    let state: AsteroidsState = createGame();
    let lastTs: number | null = null;
    let lastScore = -1;
    let lastLives = -1;
    let lastLevel = -1;
    let ended = false;
    let frameId = 0;

    const frame = (ts: number) => {
      const dt = lastTs === null ? 0 : (ts - lastTs) / 1000;
      lastTs = ts;

      if (keyboard.takePausePress()) onTogglePauseRef.current?.();

      state = setPaused(state, pausedRef.current);
      state = step(state, keyboard.read(), dt);

      if (state.score !== lastScore || state.lives !== lastLives || state.level !== lastLevel) {
        lastScore = state.score;
        lastLives = state.lives;
        lastLevel = state.level;
        onStatsRef.current({ score: state.score, lives: state.lives, level: state.level });
      }
      if (state.status === 'gameover' && !ended) {
        ended = true;
        onEndRef.current(state.score);
      }

      drawGame(ctx, state, ts);
      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      keyboard.detach();
    };
  }, []);

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        aria-label="Asteroids game field"
        style={{ display: 'block', width: '100%', maxWidth: W, height: 'auto', background: '#000' }}
      />
      {needsKeyboard && (
        <p style={{ marginTop: 12, letterSpacing: '0.1em' }}>THIS GAME NEEDS A KEYBOARD</p>
      )}
    </div>
  );
}
