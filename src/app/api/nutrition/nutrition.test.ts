import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as handleWaterPost } from "./water/route";
import { POST as handleWeightPost } from "./weight/route";

function makeRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      host: "localhost:3000",
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

describe("Nutrition API Routes", () => {
  afterEach(() => vi.unstubAllEnvs());

  describe("POST /api/nutrition/water", () => {
    it("rejects invalid date format", async () => {
      const req = makeRequest("http://localhost:3000/api/nutrition/water", {
        date: "not-a-date",
        volumeMl: 500
      });
      const res = await handleWaterPost(req);
      expect(res.status).toBe(422);
      await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining("Invalid") });
    });

    it("rejects negative volume", async () => {
      const req = makeRequest("http://localhost:3000/api/nutrition/water", {
        date: "2026-10-07",
        volumeMl: -100
      });
      const res = await handleWaterPost(req);
      expect(res.status).toBe(422);
    });

    it("returns 503 when supabase is not configured", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
      const req = makeRequest("http://localhost:3000/api/nutrition/water", {
        date: "2026-10-07",
        volumeMl: 1500
      });
      const res = await handleWaterPost(req);
      expect(res.status).toBe(503);
    });
  });

  describe("POST /api/nutrition/weight", () => {
    it("rejects out of bounds weight", async () => {
      const req = makeRequest("http://localhost:3000/api/nutrition/weight", {
        weightKg: 10
      });
      const res = await handleWeightPost(req);
      expect(res.status).toBe(422);
    });

    it("returns 503 when supabase is not configured", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
      const req = makeRequest("http://localhost:3000/api/nutrition/weight", {
        weightKg: 72.5
      });
      const res = await handleWeightPost(req);
      expect(res.status).toBe(503);
    });
  });
});
