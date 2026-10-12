import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMobileSupabaseConfig,
  getSupabase,
  isSupabaseConfigured,
  resetSupabaseInstanceForTesting,
} from "./supabase";

describe("Mobile Supabase Client Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetSupabaseInstanceForTesting();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetSupabaseInstanceForTesting();
  });

  it("returns null when configuration is missing", () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(getMobileSupabaseConfig()).toBeNull();
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("reads and parses valid EXPO_PUBLIC_* configuration", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example-project.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key-abc-123";

    const config = getMobileSupabaseConfig();
    expect(config).not.toBeNull();
    expect(config?.url).toBe("https://example-project.supabase.co");
    expect(config?.anonKey).toBe("public-anon-key-abc-123");
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("falls back to NEXT_PUBLIC_* in shared test/dev environments", () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://shared-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "shared-anon-key";

    const config = getMobileSupabaseConfig();
    expect(config?.url).toBe("https://shared-project.supabase.co");
    expect(config?.anonKey).toBe("shared-anon-key");
  });

  it("rejects malformed URLs with embedded credentials or illegal protocols", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "ftp://malicious.example.com";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    expect(getMobileSupabaseConfig()).toBeNull();

    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://admin:pass@example.supabase.co";
    expect(getMobileSupabaseConfig()).toBeNull();
  });

  it("never exposes or requires server secrets in public config", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://safe.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "safe-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "super-secret-service-role";
    process.env.USDA_FDC_API_KEY = "secret-usda-key";

    const config = getMobileSupabaseConfig();
    expect(config).toEqual({
      url: "https://safe.supabase.co",
      anonKey: "safe-anon-key",
    });
    expect((config as Record<string, unknown>).serviceRoleKey).toBeUndefined();
    expect((config as Record<string, unknown>).usdaKey).toBeUndefined();
  });

  it("throws clear configuration error if getSupabase() is called when unconfigured", () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => getSupabase()).toThrowError(/Supabase is not configured for Mobile/);
  });
});
