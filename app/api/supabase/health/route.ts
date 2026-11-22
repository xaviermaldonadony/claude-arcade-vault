import { connection } from 'next/server';
import { checkSupabaseHealth } from '@/lib/supabase/server';

// Server-only. Reports whether the Supabase project answers. Returns no project data.
// `connection()` keeps this route dynamic under cacheComponents, so the check runs per request.

export async function GET() {
  await connection();

  const result = await checkSupabaseHealth();
  if (result.ok) {
    return Response.json(result);
  }
  return Response.json(result, { status: 500 });
}
