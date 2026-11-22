// Server-side Supabase helpers. Used by route handlers only (SPEC 04, step 4).
// Reads env vars at call time, so importing this module never throws on its own.
// Neither the URL nor the key is logged or returned to the caller.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type SupabaseConfig = {
  url: string; // NEXT_PUBLIC_SUPABASE_URL, trimmed, no trailing slash
  publishableKey: string; // NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, trimmed
};

export type HealthResult = { ok: true } | { ok: false; error: 'config' | 'unreachable' };

const HEALTH_TIMEOUT_MS = 5000;

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '');
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey };
}

// Data client for route handlers (SPEC 06). Uses the publishable key, so RLS decides what it can do.
// Throws when a var is missing. The message names the var, never its value.
export function createServerSupabase(): SupabaseClient {
  const config = getSupabaseConfig();
  if (!config) {
    const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'].filter(
      (name) => !process.env[name]?.trim(),
    );
    throw new Error(`Missing env var: ${missing.join(', ')}`);
  }

  return createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function checkSupabaseHealth(): Promise<HealthResult> {
  const config = getSupabaseConfig();
  if (!config) {
    return { ok: false, error: 'config' };
  }

  try {
    const res = await fetch(`${config.url}/auth/v1/health`, {
      headers: { apikey: config.publishableKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    return res.ok ? { ok: true } : { ok: false, error: 'unreachable' };
  } catch {
    return { ok: false, error: 'unreachable' };
  }
}
