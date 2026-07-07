import { describe, expect, it } from "vitest";

import { isSupabaseConfigured } from "./supabaseClient";

describe("isSupabaseConfigured", () => {
  it("reports false when Supabase browser env vars are absent", () => {
    expect(isSupabaseConfigured()).toBe(false);
  });
});
