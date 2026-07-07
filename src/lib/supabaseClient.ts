import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Single Supabase client instance for the whole SPA. RLS gates every table read/write;
// the anon key is safe to ship to the browser. The embeddings API key lives ONLY inside
// edge functions and never appears here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseAnonKey !== "local-dev-placeholder");
}

function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "This path still uses Supabase. The CranL DATABASE_URL migration has only converted public reads so far.",
    );
  }

  client ??= createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseClient(), prop, receiver);
  },
});
