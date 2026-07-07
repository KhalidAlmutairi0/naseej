import { describe, expect, it } from "vitest";

import { isSupabaseConfigured, resolveSupabaseBrowserEnv } from "./supabaseClient";

describe("isSupabaseConfigured", () => {
  it("reports false when Supabase browser env vars are absent", () => {
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("accepts Supabase publishable key naming for the browser key", () => {
    expect(
      resolveSupabaseBrowserEnv({
        VITE_SUPABASE_URL: "https://project.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      }),
    ).toEqual({
      url: "https://project.supabase.co",
      key: "publishable-key",
    });
  });
});
