import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logWaterApi, logWeightApi } from "./tracking-api";

describe("tracking-api", () => {
  const originalFetch = globalThis.fetch;
  const mockToken = "test-bearer-token";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("logWaterApi", () => {
    it("fails early when accessToken is missing", async () => {
      const res = await logWaterApi("2026-10-08", 2500, "");
      expect(res).toEqual({
        ok: false,
        error: "Authentication required.",
        status: 401,
      });
    });

    it("sends authenticated request and returns updated data on success", async () => {
      const mockSuccessResponse = {
        ok: true,
        date: "2026-10-08",
        volumeMl: 2500,
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockSuccessResponse),
      } as unknown as Response);

      const res = await logWaterApi("2026-10-08", 2500, mockToken);

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.volumeMl).toBe(2500);
      }

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/nutrition/water"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            date: "2026-10-08",
            volumeMl: 2500,
          }),
        })
      );
    });

    it("handles server error responses cleanly", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ error: "Invalid water amount" }),
      } as unknown as Response);

      const res = await logWaterApi("2026-10-08", -100, mockToken);

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Invalid water amount");
      }
    });

    it("handles network failure gracefully", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network connection dropped"));

      const res = await logWaterApi("2026-10-08", 500, mockToken);

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Network connection dropped");
      }
    });
  });

  describe("logWeightApi", () => {
    it("fails early when accessToken is missing", async () => {
      const res = await logWeightApi(75.5, "2026-10-08T10:00:00Z", "");
      expect(res).toEqual({
        ok: false,
        error: "Authentication required.",
        status: 401,
      });
    });

    it("sends authenticated request and returns logged entry on success", async () => {
      const mockSuccessResponse = {
        ok: true,
        entry: {
          id: "weight-1",
          weight_kg: 75.5,
          recorded_at: "2026-10-08T10:00:00Z",
        },
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockSuccessResponse),
      } as unknown as Response);

      const res = await logWeightApi(75.5, "2026-10-08T10:00:00Z", mockToken, "Morning weigh-in");

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.entry.weight_kg).toBe(75.5);
      }

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/nutrition/weight"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            weightKg: 75.5,
            recordedAt: "2026-10-08T10:00:00Z",
            note: "Morning weigh-in",
          }),
        })
      );
    });

    it("handles server error responses cleanly", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ error: "Weight must be between 20kg and 500kg" }),
      } as unknown as Response);

      const res = await logWeightApi(10, "2026-10-08T10:00:00Z", mockToken);

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Weight must be between 20kg and 500kg");
      }
    });

    it("handles network failure gracefully", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Failed to reach server"));

      const res = await logWeightApi(75.5, "2026-10-08T10:00:00Z", mockToken);

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Failed to reach server");
      }
    });
  });
});
