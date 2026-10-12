import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { submitMobileOnboarding, prepareMobileOnboardingSubmission } from "./onboarding-service";
import type { QuestionnaireAnswers } from "./questionnaire";

const validAnswers: QuestionnaireAnswers = {
  goal: "maintain",
  sex: "female",
  birthDate: "1995-06-20",
  heightCm: 168,
  weightKg: 62,
  activity: "moderate",
  workouts: "3-5",
  diet: "mediterranean",
  mealsPerDay: "3",
  rollover: "yes",
  allergies: [],
  health: [],
  foodPrefs: [],
  barriers: [],
};

describe("submitMobileOnboarding", () => {
  it("fails with UNAUTHENTICATED when user session is missing", async () => {
    const getUserMock = vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const mockClient = {
      auth: { getUser: getUserMock },
    } as unknown as SupabaseClient;

    const result = await submitMobileOnboarding(mockClient, validAnswers);

    expect(result).toEqual({
      ok: false,
      error: "You must be signed in to complete onboarding.",
      code: "UNAUTHENTICATED",
    });
  });

  it("fails with VALIDATION_FAILED when answers fail validation", async () => {
    const getUserMock = vi.fn().mockResolvedValue({
      data: { user: { id: "user-abc" } },
      error: null,
    });
    const mockClient = {
      auth: { getUser: getUserMock },
    } as unknown as SupabaseClient;

    const invalidAnswers: QuestionnaireAnswers = {
      ...validAnswers,
      birthDate: "", // missing DOB
    };

    const result = await submitMobileOnboarding(mockClient, invalidAnswers);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VALIDATION_FAILED");
      expect(result.error).toMatch(/valid birth date is required/);
    }
  });

  it("invokes public.complete_onboarding RPC with valid payload and returns ok on success", async () => {
    const getUserMock = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    const rpcMock = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const mockClient = {
      auth: { getUser: getUserMock },
      rpc: rpcMock,
    } as unknown as SupabaseClient;

    const result = await submitMobileOnboarding(mockClient, validAnswers, {
      displayName: "Jane Doe",
      countryCode: "US",
    });

    expect(result).toEqual({ ok: true });
    expect(rpcMock).toHaveBeenCalledWith(
      "complete_onboarding",
      expect.objectContaining({
        p_birth_date: "1995-06-20",
        p_sex_for_calculation: "female",
        p_height_cm: 168,
        p_weight_kg: 62,
        p_activity_level: "moderate",
        p_nutrition_goal: "maintain",
        p_display_name: "Jane Doe",
        p_country_code: "US",
        p_target_calories: expect.any(Number),
        p_target_protein_grams: expect.any(Number),
        p_target_carbs_grams: expect.any(Number),
        p_target_fat_grams: expect.any(Number),
      })
    );
  });

  it("returns RPC_ERROR and does not mark complete when RPC fails", async () => {
    const getUserMock = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    const rpcMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Weight-loss plans are not available for minors." },
    });

    const mockClient = {
      auth: { getUser: getUserMock },
      rpc: rpcMock,
    } as unknown as SupabaseClient;

    const result = await submitMobileOnboarding(mockClient, validAnswers);

    expect(result).toEqual({
      ok: false,
      error: "Weight-loss plans are not available for minors.",
      code: "RPC_ERROR",
    });
  });

  it("handles network failure cleanly without crashing", async () => {
    const getUserMock = vi.fn().mockRejectedValue(new Error("Network connection dropped"));
    const mockClient = {
      auth: { getUser: getUserMock },
    } as unknown as SupabaseClient;

    const result = await submitMobileOnboarding(mockClient, validAnswers);

    expect(result).toEqual({
      ok: false,
      error: "Unable to verify session. Please check your network connection.",
      code: "NETWORK_ERROR",
    });
  });
});
