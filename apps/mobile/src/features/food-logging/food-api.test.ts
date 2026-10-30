import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteMealItemApi,
  fetchFoodDetailApi,
  logMealItemApi,
  searchFoodsApi,
} from "./food-api";

describe("food-api", () => {
  const mockUser = { id: "user-abc-123", email: "tester@fitai.local" };

  function createMockSupabase(overrides?: {
    getUserError?: Error | null;
    getUserData?: typeof mockUser | null;
    foodsSelectData?: any;
    mealSelectData?: any;
    mealInsertData?: any;
    mealItemInsertData?: any;
    nutrientsData?: any;
    deleteError?: Error | null;
    rpcData?: string | null;
    rpcError?: Error | null;
  }) {
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: overrides?.getUserData !== undefined ? overrides.getUserData : mockUser },
          error: overrides?.getUserError ?? null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: overrides?.rpcData ?? "food-persisted-uuid",
        error: overrides?.rpcError ?? null,
      }),
      from: vi.fn((table: string) => {
        if (table === "foods") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: overrides?.foodsSelectData ?? null,
                    error: null,
                  }),
                }),
                maybeSingle: vi.fn().mockResolvedValue({
                  data: overrides?.foodsSelectData ?? null,
                  error: null,
                }),
              }),
              ilike: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: Array.isArray(overrides?.foodsSelectData) ? overrides?.foodsSelectData : [],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "meals") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: overrides?.mealSelectData ?? null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: overrides?.mealInsertData ?? { id: "new-meal-id" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "meal_items") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: overrides?.mealItemInsertData ?? {
                    id: "new-item-id",
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn((col: string, val: any) => {
                const result = { error: overrides?.deleteError ?? null };
                return Object.assign(Promise.resolve(result), {
                  eq: vi.fn().mockResolvedValue(result),
                });
              }),
            }),
          };
        }
        if (table === "food_nutrients") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: overrides?.nutrientsData ?? [
                  { nutrient_id: "1008", amount_per_100g: 89, unit: "kcal" },
                  { nutrient_id: "1003", amount_per_100g: 1.1, unit: "g" },
                  { nutrient_id: "1005", amount_per_100g: 22.8, unit: "g" },
                  { nutrient_id: "1004", amount_per_100g: 0.3, unit: "g" },
                  { nutrient_id: "1079", amount_per_100g: 2.6, unit: "g" },
                ],
                error: null,
              }),
            }),
          };
        }
        return {};
      }),
    } as any;
  }

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("searchFoodsApi", () => {
    it("rejects search query shorter than 2 characters before making a network call", async () => {
      const res = await searchFoodsApi("a");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("at least 2 characters");
      }
      expect(fetch).not.toHaveBeenCalled();
    });

    it("queries USDA FoodData Central directly and parses search results", async () => {
      const mockFoods = [
        {
          fdcId: 12345,
          description: "Honeycrisp Apple",
          dataType: "Foundation",
          brandOwner: null,
          foodCategory: "Fruits",
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ foods: mockFoods }),
      });

      const res = await searchFoodsApi("apple", undefined, 10);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data).toHaveLength(1);
        expect(res.data[0].description).toBe("Honeycrisp Apple");
        expect(res.data[0].sourceId).toBe("12345");
      }

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api.nal.usda.gov/fdc/v1/foods/search"),
        expect.objectContaining({ method: "GET" })
      );
    });

    it("falls back to Supabase cached foods when USDA fetch encounters error", async () => {
      (fetch as any).mockRejectedValueOnce(new Error("Network connection dropped"));

      const mockSupabase = createMockSupabase({
        foodsSelectData: [
          {
            id: "local-food-1",
            source_system: "OTHER_VERIFIED",
            source_food_id: "quick:apple",
            description: "Apple",
            brand_owner: null,
            food_category: "Quick Foods",
          },
        ],
      });

      const res = await searchFoodsApi("apple", undefined, 10, mockSupabase);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data).toHaveLength(1);
        expect(res.data[0].description).toBe("Apple");
      }
    });
  });

  describe("fetchFoodDetailApi", () => {
    it("rejects empty fdcId", async () => {
      const res = await fetchFoodDetailApi("   ");
      expect(res.ok).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("returns cached food detail from Supabase if already present", async () => {
      const mockCachedFood = {
        id: "food-123",
        source_system: "USDA_FDC",
        source_food_id: "998877",
        description: "Greek Yogurt",
        brand_owner: "Chobani",
        food_category: "Dairy",
        food_nutrients: [
          { nutrient_id: "1008", amount_per_100g: 100, unit: "kcal" },
          { nutrient_id: "1003", amount_per_100g: 10, unit: "g" },
        ],
        food_servings: [
          { source_portion_id: "100g", description: "100 grams", gram_weight: 100, is_default: true },
        ],
      };

      const mockSupabase = createMockSupabase({ foodsSelectData: mockCachedFood });
      const res = await fetchFoodDetailApi("998877", undefined, mockSupabase);

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.description).toBe("Greek Yogurt");
        expect(res.data.nutrients).toHaveLength(2);
      }
      expect(fetch).not.toHaveBeenCalled();
    });

    it("fetches directly from USDA FoodData Central when not in Supabase cache", async () => {
      const mockSupabase = createMockSupabase({ foodsSelectData: null });

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          fdcId: 998877,
          description: "Raw Banana",
          foodNutrients: [
            { nutrientId: 1008, amount: 89 },
            { nutrientId: 1003, amount: 1.1 },
          ],
        }),
      });

      const res = await fetchFoodDetailApi("998877", undefined, mockSupabase);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.description).toBe("Raw Banana");
        expect(res.data.sourceFoodId).toBe("998877");
      }

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api.nal.usda.gov/fdc/v1/food/998877"),
        expect.objectContaining({ method: "GET" })
      );
    });
  });

  describe("logMealItemApi", () => {
    it("logs a verified quick food item directly to Supabase", async () => {
      const mockSupabase = createMockSupabase({
        foodsSelectData: { id: "existing-banana-food-id" },
        mealSelectData: { id: "existing-meal-id" },
        mealItemInsertData: { id: "created-item-id" },
      });

      const res = await logMealItemApi(
        {
          date: "2026-10-08",
          mealType: "breakfast",
          nameSnapshot: "Banana",
          quantityGrams: 118,
          quickFoodId: "banana",
          servingDescription: "1 medium (118g)",
        },
        undefined,
        mockSupabase
      );

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.id).toBe("created-item-id");
        expect(res.data.mealType).toBe("Breakfast");
        expect(res.data.calories).toBeGreaterThan(0);
      }

      expect(mockSupabase.from).toHaveBeenCalledWith("meal_items");
    });

    it("fails when user is unauthenticated", async () => {
      const mockSupabase = createMockSupabase({ getUserData: null });
      const res = await logMealItemApi(
        {
          date: "2026-10-08",
          mealType: "breakfast",
          nameSnapshot: "Banana",
          quantityGrams: 118,
          quickFoodId: "banana",
        },
        undefined,
        mockSupabase
      );

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("Authentication required");
        expect(res.status).toBe(401);
      }
    });
  });

  describe("deleteMealItemApi", () => {
    it("deletes meal item directly from Supabase for authenticated user", async () => {
      const mockSupabase = createMockSupabase();
      const res = await deleteMealItemApi("item-del-1", undefined, mockSupabase);

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data).toBe("item-del-1");
      }

      expect(mockSupabase.from).toHaveBeenCalledWith("meal_items");
    });

    it("handles delete error gracefully", async () => {
      const mockSupabase = createMockSupabase({
        deleteError: new Error("Row not found or unauthorized"),
      });

      const res = await deleteMealItemApi("item-del-error", undefined, mockSupabase);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Row not found or unauthorized");
      }
    });
  });
});
