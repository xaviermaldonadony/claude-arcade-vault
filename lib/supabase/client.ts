import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Browser client. Uses only the public URL and publishable key.
// Read at call time, so importing this module never throws on its own.
// Nothing imports it yet (SPEC 04, step 3).
export function createBrowserSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }

  return createClient(url, key);
}
