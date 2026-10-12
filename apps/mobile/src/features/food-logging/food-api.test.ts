import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteMealItemApi,
  fetchFoodDetailApi,
  logMealItemApi,
  searchFoodsApi,
} from "./food-api";

describe("food-api", () => {
  const mockToken = "mock-supabase-bearer-token-123";

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("searchFoodsApi", () => {
    it("rejects search query shorter than 2 characters before making a network call", async () => {
      const res = await searchFoodsApi("a", mockToken);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("at least 2 characters");
      }
      expect(fetch).not.toHaveBeenCalled();
    });

    it("attaches Authorization Bearer token and parses search results", async () => {
      const mockFoods = [
        {
          source: "USDA FoodData Central",
          sourceId: "12345",
          description: "Honeycrisp Apple",
          dataType: "Foundation",
          brandOwner: null,
          foodCategory: "Fruits",
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ source: "USDA FoodData Central", foods: mockFoods }),
      });

      const res = await searchFoodsApi("apple", mockToken, 10);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data).toHaveLength(1);
        expect(res.data[0].description).toBe("Honeycrisp Apple");
      }

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/foods/search?q=apple&limit=10"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it("propagates search error message from API response without fake fallback", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: "USDA FoodData Central is not configured." }),
      });

      const res = await searchFoodsApi("chicken", mockToken);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("USDA FoodData Central is not configured.");
        expect(res.status).toBe(503);
      }
    });

    it("handles network failure cleanly", async () => {
      (fetch as any).mockRejectedValueOnce(new Error("Network connection dropped"));

      const res = await searchFoodsApi("egg", mockToken);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Network connection dropped");
      }
    });
  });

  describe("fetchFoodDetailApi", () => {
    it("rejects empty fdcId", async () => {
      const res = await fetchFoodDetailApi("   ", mockToken);
      expect(res.ok).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("fetches canonical food details with Bearer token", async () => {
      const mockDetail = {
        sourceSystem: "USDA_FDC",
        sourceFoodId: "998877",
        description: "Greek Yogurt",
        nutrients: [{ nutrientId: "1008", name: "Energy", unit: "kcal", amountPer100g: 100 }],
        servings: [{ sourcePortionId: "100g", description: "100 grams", gramWeight: 100, isDefault: true }],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ food: mockDetail }),
      });

      const res = await fetchFoodDetailApi("998877", mockToken);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.description).toBe("Greek Yogurt");
        expect(res.data.nutrients).toHaveLength(1);
      }

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/foods/998877"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it("handles food not found cleanly", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Food item not found." }),
      });

      const res = await fetchFoodDetailApi("000000", mockToken);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Food item not found.");
        expect(res.status).toBe(404);
      }
    });
  });

  describe("logMealItemApi", () => {
    it("submits authenticated meal logging payload and returns created item", async () => {
      const mockLogged = {
        id: "item-new-1",
        mealId: "meal-container-1",
        foodId: "food-uuid-1",
        name: "Oatmeal",
        serving: "50g",
        weightGrams: 50,
        calories: 195,
        protein: 8.5,
        carbs: 33,
        fat: 3.5,
        fiber: 5.3,
        mealType: "Breakfast",
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, item: mockLogged }),
      });

      const res = await logMealItemApi(
        {
          date: "2026-10-08",
          mealType: "breakfast",
          nameSnapshot: "Oatmeal",
          quantityGrams: 50,
          quickFoodId: "oats",
          servingDescription: "1 bowl (50g)",
        },
        mockToken
      );

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.calories).toBe(195);
        expect(res.data.id).toBe("item-new-1");
      }

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/nutrition/meals/item"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            date: "2026-10-08",
            mealType: "breakfast",
            nameSnapshot: "Oatmeal",
            quantityGrams: 50,
            quickFoodId: "oats",
            servingDescription: "1 bowl (50g)",
          }),
        })
      );
    });

    it("propagates validation failure from server", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ error: "Quantity must be 5000g or less" }),
      });

      const res = await logMealItemApi(
        {
          date: "2026-10-08",
          mealType: "breakfast",
          nameSnapshot: "Huge meal",
          quantityGrams: 8000,
        },
        mockToken
      );

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Quantity must be 5000g or less");
        expect(res.status).toBe(422);
      }
    });
  });

  describe("deleteMealItemApi", () => {
    it("issues DELETE request with Bearer token and returns deletedId", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, deletedId: "item-del-1" }),
      });

      const res = await deleteMealItemApi("item-del-1", mockToken);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data).toBe("item-del-1");
      }

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/nutrition/meals/item/item-del-1"),
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it("handles delete failure gracefully", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Could not delete meal item." }),
      });

      const res = await deleteMealItemApi("item-del-error", mockToken);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("Could not delete meal item.");
        expect(res.status).toBe(500);
      }
    });
  });
});
