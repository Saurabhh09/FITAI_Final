import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { requireSameOrigin } from "@/lib/api/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";

describe("Server Bearer Authentication for Food APIs", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("requireSameOrigin with Bearer tokens", () => {
    it("exempts Bearer-authenticated requests from CSRF origin rejection", () => {
      const req = new NextRequest("http://localhost:3000/api/foods/search?q=apple", {
        headers: {
          authorization: "Bearer valid-test-token",
          origin: "https://arbitrary-mobile-app-origin.com",
        },
      });

      const error = requireSameOrigin(req);
      expect(error).toBeNull();
    });

    it("still blocks browser requests with mismatched origin when no Bearer token is present", () => {
      const req = new NextRequest("http://localhost:3000/api/foods/search?q=apple", {
        headers: {
          origin: "https://evil-attacker.com",
        },
      });

      const error = requireSameOrigin(req);
      expect(error).not.toBeNull();
      expect(error?.status).toBe(403);
    });
  });

  describe("createSupabaseServerClient with Bearer tokens", () => {
    it("initializes a client with Bearer Authorization header when request carries token", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test-project.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

      const req = new NextRequest("http://localhost:3000/api/foods/search?q=apple", {
        headers: {
          authorization: "Bearer mobile-access-token-999",
        },
      });

      const client = await createSupabaseServerClient(req);
      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
      expect(typeof client.auth.getUser).toBe("function");
    });
  });
});
