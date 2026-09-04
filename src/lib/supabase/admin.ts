import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Uses the service role key — this file must never be imported from a
// Client Component. It bypasses row-level security entirely, which is
// required to create auth users for new staff (regular sign-up is not
// exposed publicly).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (Project Settings → API → service_role)."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
