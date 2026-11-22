'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { getRealGame, type GameStats, type HudSlot } from '@/lib/games-registry';
import type { Game } from '@/lib/leaderboard';

// Fake ticker and arena for the games without an engine yet. Real games come from lib/games-registry.ts.
// Real games submit scores (SPEC 06, SPEC 07). Scores are saved with POST /api/scores, not localStorage.
const MAX_NAME_LENGTH = 10;

const INITIAL_SLOT: HudSlot = { label: 'Lives', value: 3, hearts: true };
const FAKE_SLOT: HudSlot = INITIAL_SLOT;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function GamePlayer({ game }: { game: Game }) {
  const { user } = useAuth();
  // A game in the registry runs its real engine. Other games keep the fake ticker.
  const entry = getRealGame(game.id);
  const RealGame = entry?.component;
  const isRealGame = entry !== undefined;
  const [score, setScore] = useState(0);
  const [realSlot, setRealSlot] = useState<HudSlot>(INITIAL_SLOT);
  const [realLevel, setRealLevel] = useState(1);
  // Changing the key remounts the engine, which starts a new game.
  const [gameKey, setGameKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  // null means "not edited yet": show the signed-in name, or GUEST.
  const [nameDraft, setNameDraft] = useState<string | null>(null);

  const name = nameDraft ?? user?.name ?? 'GUEST';
  const slot = isRealGame ? realSlot : FAKE_SLOT;
  // Fake games: level follows the score, one level every 2500 points.
  const level = isRealGame ? realLevel : 1 + Math.floor(score / 2500);

  // Stable callbacks, so the engine component does not re-sync on every render.
  const handleStats = useCallback(
    (stats: GameStats) => {
      if (!entry) return;
      const hud = entry.mapStats(stats);
      setScore(hud.score);
      setRealLevel(hud.level);
      setRealSlot(hud.slot);
    },
    [entry],
  );
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
    setRealSlot(INITIAL_SLOT);
    setRealLevel(1);
    setGameKey((k) => k + 1);
    setPaused(false);
    setOver(false);
    setSaveStatus('idle');
  };

  // Sends the score once per click. The button is disabled while the request is open.
  const submitScore = async () => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: game.id, name: name.trim() || 'GUEST', score }),
        cache: 'no-store',
      });
      setSaveStatus(res.status === 201 ? 'saved' : 'error');
    } catch {
      setSaveStatus('error');
    }
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
          <div className={slot.hearts ? 'hud-stat lives' : 'hud-stat'}>
            <div className="l">{slot.label}</div>
            <div className="v">
              {slot.hearts ? '♥ '.repeat(slot.value).trim() || '—' : String(slot.value)}
            </div>
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
          {RealGame ? (
            <div className="game-arena">
              <RealGame
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
            {!isRealGame ? (
              <div>NOT RANKED YET</div>
            ) : saveStatus === 'saved' ? (
              <div>SCORE SAVED</div>
            ) : (
              <>
                <div className="input-row">
                  <input
                    value={name}
                    onChange={(e) =>
                      setNameDraft(e.target.value.toUpperCase().slice(0, MAX_NAME_LENGTH))
                    }
                    placeholder="YOUR INITIALS"
                    aria-label="Player name"
                    disabled={saveStatus === 'saving'}
                  />
                  <button
                    type="button"
                    className="btn yellow"
                    disabled={saveStatus === 'saving'}
                    onClick={submitScore}
                  >
                    {saveStatus === 'saving' ? 'SAVING' : 'SAVE SCORE'}
                  </button>
                </div>
                {saveStatus === 'error' && (
                  <div style={{ color: 'var(--magenta)', marginTop: 10 }}>
                    COULD NOT SAVE. TRY AGAIN
                  </div>
                )}
              </>
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
