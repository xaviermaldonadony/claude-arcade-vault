'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { FloatingSilhouettes, FeatureIcon } from '@/components/pixel-icons';
import { useReveal } from '@/components/use-reveal';
import { ACTIVITY, FAQ, FEATURES, PRICING, STATS, TOP_PLAYERS } from '@/lib/data';
import { useGames } from '@/lib/use-games';

// Landing page at "/" (SPEC 02, step 7). Sections, in order: hero, // 01 features,
// // 02 games preview, stats, // 03 live activity, // 04 pricing and FAQ, final CTA.
// The games preview reads the games table (SPEC 06). The rest is static mock data from lib/data.ts. Nothing here writes to storage.
export function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { games, status: gamesStatus } = useGames();
  useReveal(rootRef);

  return (
    <div ref={rootRef} className="home fade-in">
      {/* HERO */}
      <section className="home-hero">
        <FloatingSilhouettes />
        <div className="home-hero-inner">
          <div className="hero-eyebrow pixel neon-yellow">▸ INSERT COIN</div>
          <h1 className="home-title">
            <span className="line-1">THE ARCADE</span>
            <span className="line-2">CLASSICS ARE</span>
            <span className="line-3">BACK</span>
          </h1>
          <p className="home-sub">
            Play the best classics right in your browser.
            <br />
            No downloads. No cost. Just fun.
          </p>
          <div className="home-ctas">
            <Link href="/games" className="btn xl">
              ▶ EXPLORE GAMES
            </Link>
            <Link href="/auth" className="btn xl magenta">
              ✦ CREATE ACCOUNT
            </Link>
          </div>
        </div>
        <div className="hero-scroll" aria-hidden="true">
          <span>SCROLL</span>
          <span className="arrow">▼</span>
        </div>
      </section>

      {/* WHY */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-magenta">{'// 01'}</div>
          <h2 className="section-title">WHY ARCADE VAULT?</h2>
          <div className="section-rule"></div>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={'feature-card ' + f.tone}
              style={{ transitionDelay: i * 80 + 'ms' }}
            >
              <FeatureIcon kind={f.icon} />
              <div className="ft-title pixel">{f.title}</div>
              <div className="ft-desc">{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* GAMES PREVIEW */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-cyan">{'// 02'}</div>
          <h2 className="section-title">GAMES AVAILABLE NOW</h2>
          <div className="section-rule"></div>
        </div>
        <div className="mini-rail">
          {gamesStatus === 'loading' && (
            <div className="pixel" style={{ color: 'var(--ink-faint)', fontSize: 12, padding: 24 }}>
              LOADING
            </div>
          )}
          {gamesStatus === 'error' && (
            <div className="pixel" style={{ color: 'var(--magenta)', fontSize: 12, padding: 24 }}>
              GAMES UNAVAILABLE
            </div>
          )}
          {gamesStatus === 'ready' &&
            games.slice(0, 6).map((g) => (
              <Link key={g.id} href={`/games/${g.id}`} className="mini-card">
                <div className="mini-cover">
                  <div className={'cover-bg ' + g.cover}></div>
                </div>
                <div className="mini-meta">
                  <div className="mini-title">{g.title}</div>
                  <div className="mini-cat">{g.cat}</div>
                </div>
              </Link>
            ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link href="/games" className="btn lg">
            VIEW ALL GAMES →
          </Link>
        </div>
      </section>

      {/* STATS */}
      <section className="home-stats reveal">
        <div className="stats-inner">
          {STATS.map((st, i) => (
            <div key={st.unit} className="stat-block" style={{ transitionDelay: i * 90 + 'ms' }}>
              <div className="stat-n neon-yellow">{st.value}</div>
              <div className="stat-u pixel">{st.unit}</div>
              <div className="stat-s">{st.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* LIVE ACTIVITY */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-yellow">{'// 03'}</div>
          <h2 className="section-title">LIVE ACTIVITY</h2>
          <div className="section-rule"></div>
        </div>
        <div className="activity-grid">
          <div className="activity-card">
            <div className="ac-head">
              <div className="ac-title pixel">▸ LATEST SCORES</div>
            </div>
            <div className="ticker">
              {ACTIVITY.map((r, i) => (
                <div key={i} className="tick-row" style={{ animationDelay: i * 60 + 'ms' }}>
                  <span className={'tk-p neon-' + r.tone}>{r.player}</span>
                  <span className="tk-mid">▸ {r.game}</span>
                  <span className="tk-s">+{r.score.toLocaleString('en-US')}</span>
                  <span className="tk-t">{r.ago}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="activity-card">
            <div className="ac-head">
              <div className="ac-title pixel neon-magenta">▸ TOP PLAYERS · TODAY</div>
              <Link href="/hall-of-fame" className="lb-link">
                VIEW HALL OF FAME →
              </Link>
            </div>
            <div className="top-list">
              {TOP_PLAYERS.map((r, i) => (
                <div
                  key={r.rank}
                  className={
                    'top-row' + (i === 0 ? ' top1' : i === 1 ? ' top2' : i === 2 ? ' top3' : '')
                  }
                >
                  <span className="tp-rk">#{String(r.rank).padStart(2, '0')}</span>
                  <span className="tp-bar">
                    <span className="tp-fill" style={{ width: 100 - i * 16 + '%' }}></span>
                  </span>
                  <span className="tp-p">{r.name}</span>
                  <span className="tp-s">{r.score.toLocaleString('en-US')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-green">{'// 04'}</div>
          <h2 className="section-title">PRICING</h2>
          <div className="section-rule"></div>
        </div>
        <div className="pricing-grid">
          <div className="price-card">
            <div className="pc-label pixel">{PRICING.label}</div>
            <div className="pc-name pixel">{PRICING.name}</div>
            <div className="pc-amount">
              <span className="pc-amount-n">{PRICING.amount}</span>
              <span className="pc-amount-u">{PRICING.unit}</span>
            </div>
            <div className="pc-tag">{PRICING.tag}</div>
            <ul className="pc-list">
              {PRICING.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link href="/auth" className="btn xl" style={{ width: '100%', textAlign: 'center' }}>
              GET STARTED FREE →
            </Link>
            <div className="pc-foot">{PRICING.foot}</div>
            <div className="pc-stamp pixel">
              FREE
              <br />
              PLAY
            </div>
          </div>

          <div className="pricing-faq">
            {FAQ.map((item) => (
              <div key={item.q} className="faq-item">
                <div className="faq-q pixel">{item.q}</div>
                <div className="faq-a">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="home-final reveal">
        <h2 className="final-title pixel">READY TO PLAY?</h2>
        <Link href="/games" className="btn xl final-cta">
          INSERT COIN →
        </Link>
        <div className="final-tag">Free. No sign-up required. Start in seconds.</div>
      </section>
    </div>
  );
}
