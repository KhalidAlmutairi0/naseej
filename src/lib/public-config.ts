import { createServerFn } from "@tanstack/react-start";

export interface PublicSupabaseConfig {
  url: string;
  key: string;
}

// Reads the browser-safe Supabase config from the SERVER's runtime env and hands it to the
// client. This is what makes the app work on hosts that inject env at runtime (not build
// time) or under non-VITE names - the browser bundle no longer needs VITE_* baked in.
// Both values are public (URL + anon/publishable key); RLS is what protects the data.
export const getPublicSupabaseConfig = createServerFn({ method: "GET" }).handler(
  (): PublicSupabaseConfig => {
    const e = process.env;
    return {
      url: e.VITE_SUPABASE_URL ?? e.SUPABASE_URL ?? "",
      key:
        e.VITE_SUPABASE_ANON_KEY ??
        e.VITE_SUPABASE_PUBLISHABLE_KEY ??
        e.SUPABASE_ANON_KEY ??
        e.SUPABASE_PUBLISHABLE_KEY ??
        "",
    };
  },
);
