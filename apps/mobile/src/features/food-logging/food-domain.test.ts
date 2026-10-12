import { describe, expect, it } from "vitest";
import {
  type CanonicalFoodNutrient,
  type FoodServingOption,
  VERIFIED_QUICK_FOODS,
  computeNutrientPreview,
  computePortionGrams,
  formatMealTypeDisplay,
  normalizeMealType,
} from "./food-domain";

describe("food-domain", () => {
  describe("meal type mapping", () => {
    it("normalizes display meal types to canonical backend enums", () => {
      expect(normalizeMealType("Breakfast")).toBe("breakfast");
      expect(normalizeMealType("Lunch")).toBe("lunch");
      expect(normalizeMealType("Dinner")).toBe("dinner");
      expect(normalizeMealType("Snacks")).toBe("snack");
      expect(normalizeMealType("snack")).toBe("snack");
      expect(normalizeMealType("UNKNOWN")).toBe("snack");
    });

    it("formats backend meal types to user-facing display titles", () => {
      expect(formatMealTypeDisplay("breakfast")).toBe("Breakfast");
      expect(formatMealTypeDisplay("lunch")).toBe("Lunch");
      expect(formatMealTypeDisplay("dinner")).toBe("Dinner");
      expect(formatMealTypeDisplay("snack")).toBe("Snacks");
    });
  });

  describe("portion grams calculation", () => {
    const mockServings: readonly FoodServingOption[] = [
      {
        sourcePortionId: "portion-1",
        description: "1 medium banana",
        gramWeight: 118,
        isDefault: true,
      },
      {
        sourcePortionId: "100g",
        description: "100 grams",
        gramWeight: 100,
        isDefault: false,
      },
    ];

    it("computes grams for 1x standard portion", () => {
      const grams = computePortionGrams("portion-1", mockServings, 1);
      expect(grams).toBe(118);
    });

    it("computes grams with multiplier (1.5x, 2x)", () => {
      expect(computePortionGrams("portion-1", mockServings, 1.5)).toBe(177);
      expect(computePortionGrams("portion-1", mockServings, 2)).toBe(236);
    });

    it("defaults to 100g if portion id is not found in servings", () => {
      const grams = computePortionGrams("unknown-portion", mockServings, 1);
      expect(grams).toBe(100);
    });

    it("uses custom grams when custom_grams portion is selected", () => {
      const grams = computePortionGrams("custom_grams", mockServings, 1, 250);
      expect(grams).toBe(250);
    });

    it("clamps custom grams to safe range [1, 5000]", () => {
      expect(computePortionGrams("custom_grams", mockServings, 1, -50)).toBe(1);
      expect(computePortionGrams("custom_grams", mockServings, 1, 0)).toBe(1);
      expect(computePortionGrams("custom_grams", mockServings, 1, 10000)).toBe(5000);
    });

    it("falls back to 100g for invalid custom grams input", () => {
      expect(computePortionGrams("custom_grams", mockServings, 1, NaN)).toBe(100);
    });
  });

  describe("nutrient preview calculation", () => {
    const mockNutrients: readonly CanonicalFoodNutrient[] = [
      { nutrientId: "1008", name: "Energy", unit: "kcal", amountPer100g: 200 },
      { nutrientId: "1003", name: "Protein", unit: "g", amountPer100g: 20.5 },
      { nutrientId: "1005", name: "Carbohydrate", unit: "g", amountPer100g: 10 },
      { nutrientId: "1004", name: "Fat", unit: "g", amountPer100g: 5.2 },
      { nutrientId: "1079", name: "Fiber", unit: "g", amountPer100g: 3.4 },
    ];

    it("computes exact nutrient facts for 100g baseline", () => {
      const preview = computeNutrientPreview(mockNutrients, 100);
      expect(preview.calories).toBe(200);
      expect(preview.protein).toBe(20.5);
      expect(preview.carbs).toBe(10);
      expect(preview.fat).toBe(5.2);
      expect(preview.fiber).toBe(3.4);
    });

    it("scales nutrient values accurately for 150g portion", () => {
      const preview = computeNutrientPreview(mockNutrients, 150);
      // 200 * 1.5 = 300 kcal
      expect(preview.calories).toBe(300);
      // 20.5 * 1.5 = 30.75 -> 30.8g
      expect(preview.protein).toBe(30.8);
      // 10 * 1.5 = 15g
      expect(preview.carbs).toBe(15);
      // 5.2 * 1.5 = 7.8g
      expect(preview.fat).toBe(7.8);
      // 3.4 * 1.5 = 5.1g
      expect(preview.fiber).toBe(5.1);
    });

    it("returns null for missing/unavailable nutrients without inventing fake values", () => {
      const partialNutrients: readonly CanonicalFoodNutrient[] = [
        { nutrientId: "1008", name: "Energy", unit: "kcal", amountPer100g: 120 },
      ];
      const preview = computeNutrientPreview(partialNutrients, 100);
      expect(preview.calories).toBe(120);
      expect(preview.protein).toBeNull();
      expect(preview.carbs).toBeNull();
      expect(preview.fat).toBeNull();
      expect(preview.fiber).toBeNull();
    });
  });

  describe("verified quick foods", () => {
    it("provides 17 verified common foods with non-zero weights and valid nutrients", () => {
      expect(VERIFIED_QUICK_FOODS.length).toBe(17);
      for (const item of VERIFIED_QUICK_FOODS) {
        expect(item.id.length).toBeGreaterThan(0);
        expect(item.name.length).toBeGreaterThan(0);
        expect(item.grams).toBeGreaterThan(0);
        expect(item.cal).toBeGreaterThanOrEqual(0);
        expect(item.p).toBeGreaterThanOrEqual(0);
        expect(item.c).toBeGreaterThanOrEqual(0);
        expect(item.f).toBeGreaterThanOrEqual(0);
        expect(item.emoji.length).toBeGreaterThan(0);
      }
    });
  });
});
