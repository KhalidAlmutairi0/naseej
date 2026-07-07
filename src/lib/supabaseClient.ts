import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Single Supabase client for the whole SPA. The anon/publishable key is browser-safe;
// RLS gates every read/write. The embeddings/secret keys live ONLY in edge functions.
//
// Config is resolved LAZILY from (in order):
//   1. window.__SUPABASE__  — injected by the SSR server at runtime (see public-config.ts)
//   2. import.meta.env      — VITE_* baked in at build time (local dev / build-time hosts)
//   3. process.env          — server runtime env, accepting VITE_ or plain SUPABASE_ names
// This makes the app work whether the host injects env at build time or runtime, and
// whether the vars are named VITE_SUPABASE_* or SUPABASE_*.

interface ResolvedConfig {
  url?: string;
  key?: string;
}

interface SupabaseBrowserEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

export function resolveSupabaseBrowserEnv(env: SupabaseBrowserEnv): ResolvedConfig {
  return {
    url: env.VITE_SUPABASE_URL,
    key: env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

function fromWindow(): ResolvedConfig {
  if (typeof window !== "undefined") {
    const w = (window as unknown as { __SUPABASE__?: ResolvedConfig }).__SUPABASE__;
    if (w?.url && w?.key) return w;
  }
  return {};
}

function fromProcessEnv(): ResolvedConfig {
  const e = typeof process !== "undefined" ? process.env : undefined;
  if (!e) return {};
  return {
    url: e.VITE_SUPABASE_URL ?? e.SUPABASE_URL,
    key:
      e.VITE_SUPABASE_ANON_KEY ??
      e.VITE_SUPABASE_PUBLISHABLE_KEY ??
      e.SUPABASE_ANON_KEY ??
      e.SUPABASE_PUBLISHABLE_KEY,
  };
}

function resolveConfig(): ResolvedConfig {
  const w = fromWindow();
  if (w.url && w.key) return w;
  const im = resolveSupabaseBrowserEnv(import.meta.env as SupabaseBrowserEnv);
  if (im.url && im.key) return im;
  const p = fromProcessEnv();
  if (p.url && p.key) return p;
  return { url: w.url ?? im.url ?? p.url, key: w.key ?? im.key ?? p.key };
}

let client: SupabaseClient | undefined;

export function isSupabaseConfigured(): boolean {
  const { url, key } = resolveConfig();
  return Boolean(url && key && key !== "local-dev-placeholder");
}

function getSupabaseClient(): SupabaseClient {
  const { url, key } = resolveConfig();
  if (!url || !key || key === "local-dev-placeholder") {
    throw new Error(
      "Supabase config missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY on the server).",
    );
  }
  client ??= createClient(url, key, {
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
