import { describe, expect, it, vi } from "vitest";
import { logWaterApi, logWeightApi } from "./tracking-api";

describe("tracking-api", () => {
  const mockUser = { id: "user-123", email: "user@example.com" };

  function createMockSupabase(overrides?: {
    getUserError?: Error | null;
    getUserData?: typeof mockUser | null;
    upsertError?: Error | null;
    insertError?: Error | null;
    insertData?: { id: string; weight_kg: number; recorded_at: string } | null;
  }) {
    const upsertFn = vi.fn().mockResolvedValue({
      error: overrides?.upsertError ? { message: overrides.upsertError.message } : null,
    });

    const insertSingleFn = vi.fn().mockResolvedValue({
      data: overrides?.insertData ?? {
        id: "weight-entry-1",
        weight_kg: 75.5,
        recorded_at: "2026-10-08T10:00:00Z",
      },
      error: overrides?.insertError ? { message: overrides.insertError.message } : null,
    });

    const selectFn = vi.fn().mockReturnValue({
      single: insertSingleFn,
    });

    const insertFn = vi.fn().mockReturnValue({
      select: selectFn,
    });

    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: overrides?.getUserData !== undefined ? overrides.getUserData : mockUser },
          error: overrides?.getUserError ?? null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "hydration_logs") {
          return { upsert: upsertFn };
        }
        if (table === "weight_entries") {
          return { insert: insertFn };
        }
        return {};
      }),
      _mocks: {
        upsertFn,
        insertFn,
        insertSingleFn,
      },
    } as any;
  }

  describe("logWaterApi", () => {
    it("fails early when volume is invalid", async () => {
      const res = await logWaterApi("2026-10-08", -100);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Volume must be between 0 and 20000 ml.");
      }
    });

    it("fails early when date format is invalid", async () => {
      const res = await logWaterApi("not-a-date", 2500);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Date must be YYYY-MM-DD.");
      }
    });

    it("fails when user is unauthenticated", async () => {
      const mockSupabase = createMockSupabase({ getUserData: null });
      const res = await logWaterApi("2026-10-08", 2500, undefined, mockSupabase);
      expect(res).toEqual({
        ok: false,
        error: "Authentication required.",
        status: 401,
      });
    });

    it("upserts hydration_logs directly to Supabase on success", async () => {
      const mockSupabase = createMockSupabase();
      const res = await logWaterApi("2026-10-08", 2500, undefined, mockSupabase);

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.volumeMl).toBe(2500);
        expect(res.data.date).toBe("2026-10-08");
      }

      expect(mockSupabase.from).toHaveBeenCalledWith("hydration_logs");
      expect(mockSupabase._mocks.upsertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          local_date: "2026-10-08",
          volume_ml: 2500,
        }),
        { onConflict: "user_id,local_date" }
      );
    });

    it("handles database error cleanly", async () => {
      const mockSupabase = createMockSupabase({
        upsertError: new Error("Database connection lost"),
      });

      const res = await logWaterApi("2026-10-08", 500, undefined, mockSupabase);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Database connection lost");
      }
    });
  });

  describe("logWeightApi", () => {
    it("fails early when weight is out of valid bounds", async () => {
      const res = await logWeightApi(10, "2026-10-08T10:00:00Z");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Weight must be between 20 and 500 kg.");
      }
    });

    it("fails when user is unauthenticated", async () => {
      const mockSupabase = createMockSupabase({ getUserData: null });
      const res = await logWeightApi(75.5, "2026-10-08T10:00:00Z", undefined, undefined, mockSupabase);
      expect(res).toEqual({
        ok: false,
        error: "Authentication required.",
        status: 401,
      });
    });

    it("inserts weight_entries directly to Supabase on success", async () => {
      const mockSupabase = createMockSupabase();
      const res = await logWeightApi(
        75.5,
        "2026-10-08T10:00:00Z",
        undefined,
        "Morning weigh-in",
        mockSupabase
      );

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.entry.weight_kg).toBe(75.5);
        expect(res.data.entry.id).toBe("weight-entry-1");
      }

      expect(mockSupabase.from).toHaveBeenCalledWith("weight_entries");
      expect(mockSupabase._mocks.insertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          weight_kg: 75.5,
          recorded_at: "2026-10-08T10:00:00Z",
          note: "Morning weigh-in",
        })
      );
    });

    it("handles database insert failure gracefully", async () => {
      const mockSupabase = createMockSupabase({
        insertError: new Error("Failed to insert weight entry"),
        insertData: null,
      });

      const res = await logWeightApi(75.5, "2026-10-08T10:00:00Z", undefined, undefined, mockSupabase);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Failed to insert weight entry");
      }
    });
  });
});
