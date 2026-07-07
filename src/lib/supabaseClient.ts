import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Single Supabase client instance for the whole SPA. RLS gates every table read/write;
// the anon key is safe to ship to the browser. The embeddings API key lives ONLY inside
// edge functions and never appears here.
interface SupabaseBrowserEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

export function resolveSupabaseBrowserEnv(env: SupabaseBrowserEnv) {
  return {
    url: env.VITE_SUPABASE_URL,
    key: env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

const { url: supabaseUrl, key: supabaseAnonKey } = resolveSupabaseBrowserEnv(
  import.meta.env as SupabaseBrowserEnv,
);

let client: SupabaseClient | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseAnonKey !== "local-dev-placeholder");
}

function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase browser env vars are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY, then redeploy.",
    );
  }

  client ??= createClient(supabaseUrl as string, supabaseAnonKey as string, {
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
