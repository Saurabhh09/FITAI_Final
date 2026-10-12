import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkUserNutritionProfileExists } from "./profile-service";

describe("checkUserNutritionProfileExists", () => {
  it("returns exists: true when public.user_nutrition_profiles contains user row", async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: { user_id: "user-123" },
      error: null,
    });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });

    const mockClient = {
      from: fromMock,
    } as unknown as SupabaseClient;

    const result = await checkUserNutritionProfileExists(mockClient, "user-123");

    expect(fromMock).toHaveBeenCalledWith("user_nutrition_profiles");
    expect(selectMock).toHaveBeenCalledWith("user_id");
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-123");
    expect(result).toEqual({ exists: true });
  });

  it("returns exists: false when user has no record in user_nutrition_profiles", async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });

    const mockClient = {
      from: fromMock,
    } as unknown as SupabaseClient;

    const result = await checkUserNutritionProfileExists(mockClient, "user-new");

    expect(result).toEqual({ exists: false });
  });

  it("returns error message when Supabase query fails", async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "database connection error" },
    });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });

    const mockClient = {
      from: fromMock,
    } as unknown as SupabaseClient;

    const result = await checkUserNutritionProfileExists(mockClient, "user-err");

    expect(result).toEqual({
      exists: false,
      error: "database connection error",
    });
  });

  it("rejects missing user ID", async () => {
    const mockClient = {} as unknown as SupabaseClient;
    const result = await checkUserNutritionProfileExists(mockClient, "");

    expect(result).toEqual({
      exists: false,
      error: "A valid user ID is required.",
    });
  });
});
