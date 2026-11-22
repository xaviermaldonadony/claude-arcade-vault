import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Courier_Prime, JetBrains_Mono, Press_Start_2P } from 'next/font/google';
import './globals.css';
import './arcade.css';
import { AuthProvider } from '@/components/auth-provider';
import { Nav } from '@/components/nav';

const pressStart = Press_Start_2P({
  variable: '--font-pixel',
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const courierPrime = Courier_Prime({
  variable: '--font-courier',
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Arcade Vault',
  description: 'It is an online gaming platform where players compete for the highest score.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // TEMP: browser extensions (e.g. ones injecting bis_skin_checked / __processed_* attributes)
    // cause hydration attribute mismatches in dev. suppressHydrationWarning only silences the
    // warning on these two elements, not their children. REMOVE before release to prod.
    <html
      lang="en"
      className={`${pressStart.variable} ${jetbrainsMono.variable} ${courierPrime.variable}`}
      suppressHydrationWarning
    >
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
