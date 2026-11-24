import type { Metadata } from 'next';
import { Suspense } from 'react';
// Self-hosted fonts (no runtime or build-time request to Google Fonts).
import '@fontsource/press-start-2p/400.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import './globals.css';
import './arcade.css';
import { AuthProvider } from '@/components/auth-provider';
import { Nav } from '@/components/nav';

export const metadata: Metadata = {
  title: 'Arcade Vault',
  description: 'It is an online gaming platform where players compete for the highest score.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // TEMP: browser extensions (e.g. ones injecting bis_skin_checked / __processed_* attributes)
    // cause hydration attribute mismatches in dev. suppressHydrationWarning only silences the
    // warning on these two elements, not their children. REMOVE before release to prod.
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="av-bg" />
        <div className="av-noise" />
        <AuthProvider>
          <div id="root">
            <Suspense fallback={null}>
              <Nav />
            </Suspense>
            <main className="av-main">{children}</main>
            <footer
              style={{
                borderTop: '1px solid var(--line)',
                padding: '20px 32px',
                textAlign: 'center',
                color: 'var(--ink-faint)',
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.16em',
              }}
            >
              © 2026 ARCADE VAULT · MADE WITH PIXELS AND NEON · v2.6.0
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
