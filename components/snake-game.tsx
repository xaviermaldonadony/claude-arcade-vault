'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { FRUIT_SHEET } from '@/lib/snake/atlas';
import { attachKeyboard } from '@/lib/snake/input';
import { createGame, level, setPaused, step } from '@/lib/snake/engine';
import { drawGame } from '@/lib/snake/render';
import type { SnakeState } from '@/lib/snake/types';
import { CELL, COLS, ROWS } from '@/lib/snake/constants';

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
  // Called when score, level, or length change.
  onStats: (stats: { score: number; level: number; length?: number }) => void;
  // Called once when the game reaches game over, with the final score.
  onEnd: (score: number) => void;
  // Called when P or Escape is pressed, so the player can toggle its paused state.
  onTogglePause?: () => void;
};

export function SnakeGame({ paused, onStats, onEnd, onTogglePause }: Props) {
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
    let state: SnakeState = createGame();
    let lastTs: number | null = null;
    let lastKey = '';
    let ended = false;
    let frameId = 0;

    // The sprite sheet loads in the background. Until it is ready the game draws the magenta fallback.
    let fruitImage: HTMLImageElement | null = null;
    const image = new Image();
    image.src = FRUIT_SHEET.path;
    image.onload = () => {
      fruitImage = image;
    };

    const frame = (ts: number) => {
      const dt = lastTs === null ? 0 : (ts - lastTs) / 1000;
      lastTs = ts;

      if (keyboard.takePausePress()) onTogglePauseRef.current?.();

      state = setPaused(state, pausedRef.current);
      state = step(state, { turn: keyboard.takeTurn() }, dt);

      const key = `${state.score}|${state.fruits}|${state.status}`;
      if (key !== lastKey) {
        lastKey = key;
        onStatsRef.current({
          score: state.score,
          level: level(state.fruits),
          length: state.body.length,
        });
      }
      if (state.status === 'gameover' && !ended) {
        ended = true;
        onEndRef.current(state.score);
      }

      drawGame(ctx, state, fruitImage);
      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      keyboard.detach();
      image.onload = null;
    };
  }, []);

  // Fills the parent (the CRT screen arena). The canvas keeps its square ratio inside it.
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <canvas
        ref={canvasRef}
        width={COLS * CELL}
        height={ROWS * CELL}
        aria-label="Snake game field"
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
