import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Public client (respects RLS) — for reads
export function getSupabase(): SupabaseClient {
  return createClient(
    process.env.SUPA_PROJECT_URL!,
    process.env.ANON_KEY!
  );
}

// Admin client (bypasses RLS) — for server-side writes
export function getSupabaseAdmin(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(
    process.env.SUPA_PROJECT_URL!,
    serviceKey || process.env.ANON_KEY!
  );
}

// Convenience aliases
export const supabase = { get: getSupabase };
export const supabaseAdmin = { get: getSupabaseAdmin };
