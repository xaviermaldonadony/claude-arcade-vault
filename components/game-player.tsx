'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { AsteroidsGame } from '@/components/asteroids-game';
import type { Game } from '@/lib/data';

// Fake ticker and arena for the games without an engine yet. Asteroids runs the real engine.
const SCORES_KEY = 'av_scores';
const MAX_NAME_LENGTH = 10;

type SavedScore = { game: string; score: number; name: string; at: number };

function saveScore(entry: Omit<SavedScore, 'at'>) {
  try {
    const all: SavedScore[] = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable or corrupt: the score is not saved.
  }
}

export function GamePlayer({ game }: { game: Game }) {
  const { user } = useAuth();
  // Only asteroids runs the real engine. Other games keep the fake ticker.
  const isRealGame = game.id === 'asteroids';
  const [score, setScore] = useState(0);
  const [realLives, setRealLives] = useState(3);
  const [realLevel, setRealLevel] = useState(1);
  // Changing the key remounts the engine, which starts a new game.
  const [gameKey, setGameKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);
  // null means "not edited yet": show the signed-in name, or GUEST.
  const [nameDraft, setNameDraft] = useState<string | null>(null);

  const name = nameDraft ?? user?.name ?? 'GUEST';
  const lives = isRealGame ? realLives : 3;
  // Fake games: level follows the score, one level every 2500 points.
  const level = isRealGame ? realLevel : 1 + Math.floor(score / 2500);

  // Stable callbacks, so the engine component does not re-sync on every render.
  const handleStats = useCallback((stats: { score: number; lives: number; level: number }) => {
    setScore(stats.score);
    setRealLives(stats.lives);
    setRealLevel(stats.level);
  }, []);
  const handleEnd = useCallback((finalScore: number) => {
    setScore(finalScore);
    setOver(true);
  }, []);

  useEffect(() => {
    if (over || paused || isRealGame) return;
    const t = setInterval(() => setScore((s) => s + Math.floor(10 + Math.random() * 90)), 220);
    return () => clearInterval(t);
  }, [over, paused, isRealGame]);

  const restart = () => {
    setScore(0);
    setRealLives(3);
    setRealLevel(1);
    setGameKey((k) => k + 1);
    setPaused(false);
    setOver(false);
    setSaved(false);
  };

  return (
    <div className="av-player">
      <div className="player-hud">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div className="hud-stat">
            <div className="l">Player</div>
            <div className="v" style={{ color: 'var(--ink)' }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Score</div>
            <div className="v">{score.toLocaleString('en-US')}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Lives</div>
            <div className="v">{'♥ '.repeat(lives).trim() || '—'}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Level</div>
            <div className="v">{String(level).padStart(2, '0')}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button type="button" className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? 'RESUME' : 'PAUSE'}
          </button>
          <button type="button" className="btn magenta" onClick={() => setOver(true)}>
            END
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost">
            EXIT
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isRealGame ? (
            <div className="game-arena">
              <AsteroidsGame
                key={gameKey}
                paused={paused || over}
                onStats={handleStats}
                onEnd={handleEnd}
                onTogglePause={() => setPaused((p) => !p)}
              />
            </div>
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {!isRealGame && paused && (
            <div className="crt-content" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  PAUSED
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-dim)',
                    marginTop: 10,
                    letterSpacing: '0.16em',
                  }}
                >
                  PRESS RESUME TO CONTINUE
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SIGNAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>LOAD · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>GAME OVER</h2>
            <div className="final-label">FINAL SCORE</div>
            <div className="final">{score.toLocaleString('en-US')}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setNameDraft(e.target.value.toUpperCase().slice(0, MAX_NAME_LENGTH))
                  }
                  placeholder="YOUR INITIALS"
                  aria-label="Player name"
                />
                <button
                  type="button"
                  className="btn yellow"
                  onClick={() => {
                    saveScore({ game: game.id, score, name: name.trim() || 'GUEST' });
                    setSaved(true);
                  }}
                >
                  SAVE SCORE
                </button>
              </div>
            ) : (
              <div>SCORE SAVED</div>
            )}
            <div className="actions">
              <button type="button" className="btn" onClick={restart}>
                PLAY AGAIN
              </button>
              <Link href="/" className="btn magenta">
                BACK TO THE VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
