import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchDashboardData } from "./dashboard-service";

describe("fetchDashboardData", () => {
  const mockUserId = "user-123";
  const mockSelectedDate = "2026-10-08";
  const mockYesterdayDate = "2026-10-07";

  it("fails with UNAUTHENTICATED when userId is missing", async () => {
    const mockClient = {} as unknown as SupabaseClient;
    const result = await fetchDashboardData(mockClient, "", mockSelectedDate);

    expect(result).toEqual({
      ok: false,
      error: "User session required to load dashboard.",
      code: "UNAUTHENTICATED",
    });
  });

  it("fails with NO_PROFILE when user has no record in user_nutrition_profiles", async () => {
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "user_nutrition_profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        if (table === "hydration_logs") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "weight_entries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "meals") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const result = await fetchDashboardData(mockClient, mockUserId, mockSelectedDate);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NO_PROFILE");
    }
  });

  it("successfully loads profile, aggregates meals with scaled nutrients, applies rollover, and preserves user isolation", async () => {
    const mockNutritionProfile = {
      target_calories: 2200,
      target_protein_grams: 150,
      target_carbs_grams: 250,
      target_fat_grams: 65,
      target_fiber_grams: 30,
      target_water_ml: 2500,
      calorie_rollover: true,
      goal: "lose_weight",
      weight_kg: 78.5,
      target_weight_kg: 72.0,
    };

    const mockMeals = [
      // Today's meal: Lunch
      {
        id: "meal-today",
        logged_for: mockSelectedDate,
        meal_type: "Lunch",
        meal_items: [
          {
            id: "item-1",
            item_name_snapshot: "Grilled Chicken Breast",
            quantity_grams: 200, // 200g
            food_id: "food-1",
            foods: {
              food_nutrients: [
                { nutrient_id: "1008", amount_per_100g: 165, unit: "kcal" }, // 330 kcal
                { nutrient_id: "1003", amount_per_100g: 31, unit: "g" },     // 62 g protein
                { nutrient_id: "1005", amount_per_100g: 0, unit: "g" },      // 0 g carbs
                { nutrient_id: "1004", amount_per_100g: 3.6, unit: "g" },    // 7.2 g fat
                { nutrient_id: "1079", amount_per_100g: 0, unit: "g" },      // 0 g fiber
              ],
            },
          },
        ],
      },
      // Yesterday's meal: consumed 2050 kcal -> unused: 150 kcal -> rollover: 150 kcal
      {
        id: "meal-yesterday",
        logged_for: mockYesterdayDate,
        meal_type: "Dinner",
        meal_items: [
          {
            id: "item-y",
            item_name_snapshot: "Yesterday Meal",
            quantity_grams: 1000,
            food_id: "food-y",
            foods: {
              food_nutrients: [
                { nutrient_id: "1008", amount_per_100g: 205, unit: "kcal" }, // 2050 kcal
              ],
            },
          },
        ],
      },
    ];

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "user_nutrition_profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockNutritionProfile, error: null }),
              }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { display_name: "Alex" }, error: null }),
              }),
            }),
          };
        }
        if (table === "hydration_logs") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { volume_ml: 1800 }, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "weight_entries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { weight_kg: 77.2, recorded_at: "2026-10-08T10:00:00Z" },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "meals") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: mockMeals, error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const result = await fetchDashboardData(mockClient, mockUserId, mockSelectedDate);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data;
    // Targets from profile
    expect(data.profile.targetCalories).toBe(2200);
    expect(data.profile.targetProteinGrams).toBe(150);
    expect(data.profile.displayName).toBe("Alex");

    // Rollover: 2200 - 2050 = 150 kcal
    expect(data.rolloverKcal).toBe(150);
    // Available = 2200 + 150 = 2350
    expect(data.availableCalories).toBe(2350);

    // Consumed: 330 kcal, 62g protein, 7.2g fat
    expect(data.consumedTotals.calories).toBe(330);
    expect(data.consumedTotals.protein).toBe(62);
    expect(data.consumedTotals.fat).toBe(7.2);

    // Remaining: 2350 - 330 = 2020 kcal
    expect(data.caloriesRemaining).toBe(2020);

    // Water
    expect(data.waterMl).toBe(1800);

    // Weight
    expect(data.latestWeightKg).toBe(77.2);
    expect(data.latestWeightDate).toBe("2026-10-08T10:00:00Z");

    // Meal buckets
    const lunch = data.mealBuckets.find((b) => b.mealType === "Lunch");
    expect(lunch?.items).toHaveLength(1);
    expect(lunch?.totals.calories).toBe(330);
  });

  it("handles zero-meal day gracefully with real zeros", async () => {
    const mockNutritionProfile = {
      target_calories: 2000,
      target_protein_grams: 140,
      target_carbs_grams: 220,
      target_fat_grams: 60,
      target_fiber_grams: 28,
      target_water_ml: 2200,
      calorie_rollover: false,
      goal: "maintain",
      weight_kg: 70,
      target_weight_kg: null,
    };

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "user_nutrition_profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockNutritionProfile, error: null }),
              }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        if (table === "hydration_logs") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "weight_entries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "meals") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const result = await fetchDashboardData(mockClient, mockUserId, mockSelectedDate);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.consumedTotals.calories).toBe(0);
    expect(result.data.consumedTotals.protein).toBe(0);
    expect(result.data.allMealItems).toHaveLength(0);
    expect(result.data.caloriesRemaining).toBe(2000);
    expect(result.data.waterMl).toBe(0);
    expect(result.data.latestWeightKg).toBeNull();
    expect(result.data.latestWeightDate).toBeNull();
  });

  it("propagates database error cleanly as QUERY_ERROR without fake fallback", async () => {
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "user_nutrition_profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "Internal database query error" },
                }),
              }),
            }),
          };
        }
        const chain: Record<string, unknown> = {};
        chain.eq = vi.fn().mockReturnValue(chain);
        chain.in = vi.fn().mockReturnValue(chain);
        chain.order = vi.fn().mockReturnValue(chain);
        chain.limit = vi.fn().mockReturnValue(chain);
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
        return {
          select: vi.fn().mockReturnValue(chain),
        };
      }),
    } as unknown as SupabaseClient;

    const result = await fetchDashboardData(mockClient, mockUserId, mockSelectedDate);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("QUERY_ERROR");
      expect(result.error).toBe("Internal database query error");
    }
  });

  it("correctly isolates water and weight by authenticated user and selected date without mutating nutrition targets", async () => {
    const mockNutritionProfile = {
      target_calories: 2400,
      target_protein_grams: 160,
      target_carbs_grams: 280,
      target_fat_grams: 70,
      target_fiber_grams: 35,
      target_water_ml: 3000,
      calorie_rollover: false,
      goal: "lose_weight",
      weight_kg: 85.0, // baseline onboarding weight
      target_weight_kg: 78.0,
    };

    let hydrationUserFilter = "";
    let hydrationDateFilter = "";
    let weightUserFilter = "";

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "user_nutrition_profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockNutritionProfile, error: null }),
              }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { display_name: "Sam" }, error: null }),
              }),
            }),
          };
        }
        if (table === "hydration_logs") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (col === "user_id") hydrationUserFilter = val;
                return {
                  eq: vi.fn().mockImplementation((col2: string, val2: string) => {
                    if (col2 === "local_date") hydrationDateFilter = val2;
                    return {
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: { volume_ml: 3500 }, // over-target 3500 ml logged
                        error: null,
                      }),
                    };
                  }),
                };
              }),
            }),
          };
        }
        if (table === "weight_entries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (col === "user_id") weightUserFilter = val;
                return {
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: { weight_kg: 82.5, recorded_at: "2026-10-08T08:30:00Z" },
                        error: null,
                      }),
                    }),
                  }),
                };
              }),
            }),
          };
        }
        if (table === "meals") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const result = await fetchDashboardData(mockClient, mockUserId, mockSelectedDate);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Verify filters strictly use userId and selectedDate
    expect(hydrationUserFilter).toBe(mockUserId);
    expect(hydrationDateFilter).toBe(mockSelectedDate);
    expect(weightUserFilter).toBe(mockUserId);

    // Over-target water is preserved exactly without artificial cap
    expect(result.data.waterMl).toBe(3500);
    expect(result.data.profile.targetWaterMl).toBe(3000);

    // Latest weight reflects the latest weigh-in while profile targets remain intact
    expect(result.data.latestWeightKg).toBe(82.5);
    expect(result.data.latestWeightDate).toBe("2026-10-08T08:30:00Z");
    expect(result.data.profile.weightKg).toBe(85.0); // Baseline onboarding weight untouched
    expect(result.data.profile.targetCalories).toBe(2400); // Nutrition target untouched
  });
});
