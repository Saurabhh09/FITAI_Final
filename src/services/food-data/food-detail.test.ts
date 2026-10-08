import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  normalizeUsdaFoodDetail,
  fetchAndNormalizeUsdaFood,
  CORE_NUTRIENT_IDS
} from "./food-detail";
import { FdcProviderError, FdcConfigurationError } from "./usda-fdc";

describe("Food Detail Normalization (normalizeUsdaFoodDetail)", () => {
  it("parses Foundation / SR Legacy food with standard nutrient IDs and portions", () => {
    const rawUsda = {
      fdcId: 171688,
      description: "Apples, raw, gala, with skin",
      dataType: "Foundation",
      foodCategory: "Fruits and Fruit Juices",
      publicationDate: "2020-10-30",
      foodNutrients: [
        {
          nutrient: { id: 1008, number: "208", name: "Energy", unitName: "kcal" },
          amount: 52
        },
        {
          nutrient: { id: 1003, number: "203", name: "Protein", unitName: "g" },
          amount: 0.26
        },
        {
          nutrient: { id: 1005, number: "205", name: "Carbohydrate, by difference", unitName: "g" },
          amount: 13.81
        },
        {
          nutrient: { id: 1004, number: "204", name: "Total lipid (fat)", unitName: "g" },
          amount: 0.17
        },
        {
          nutrient: { id: 1079, number: "291", name: "Fiber, total dietary", unitName: "g" },
          amount: 2.4
        }
      ],
      foodPortions: [
        {
          id: 9001,
          gramWeight: 182,
          portionDescription: "1 medium (3\" dia)",
          modifier: "medium"
        },
        {
          id: 9002,
          gramWeight: 242,
          portionDescription: "1 large (3-1/4\" dia)",
          modifier: "large"
        }
      ]
    };

    const normalized = normalizeUsdaFoodDetail(rawUsda);

    expect(normalized.sourceFoodId).toBe("171688");
    expect(normalized.sourceSystem).toBe("USDA_FDC");
    expect(normalized.description).toBe("Apples, raw, gala, with skin");
    expect(normalized.sourceDataType).toBe("Foundation");
    expect(normalized.foodCategory).toBe("Fruits and Fruit Juices");

    // Per 100g nutrients array
    const cal = normalized.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.CALORIES);
    const pro = normalized.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.PROTEIN);
    const carb = normalized.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.CARBS);
    const fat = normalized.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.FAT);
    const fiber = normalized.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.FIBER);

    expect(cal?.amountPer100g).toBe(52);
    expect(pro?.amountPer100g).toBe(0.26);
    expect(carb?.amountPer100g).toBe(13.81);
    expect(fat?.amountPer100g).toBe(0.17);
    expect(fiber?.amountPer100g).toBe(2.4);

    // Serving options (includes 100g baseline + 2 USDA portions)
    expect(normalized.servings).toHaveLength(3);
    expect(normalized.servings.find((s) => s.sourcePortionId === "9001")?.gramWeight).toBe(182);
    expect(normalized.servings.find((s) => s.sourcePortionId === "9002")?.gramWeight).toBe(242);
  });

  it("parses Branded food reported per serving and scales to per 100g", () => {
    const rawBranded = {
      fdcId: 555555,
      description: "WHOLE WHEAT BREAD",
      dataType: "Branded",
      brandOwner: "Bakery Brand LLC",
      servingSize: 50,
      servingSizeUnit: "g",
      householdServingFullText: "1 slice (50g)",
      foodNutrients: [
        {
          nutrient: { id: 1008, number: "208", name: "Energy", unitName: "kcal" },
          amount: 110 // 110 kcal per 50g serving -> 220 kcal / 100g
        },
        {
          nutrient: { id: 1003, number: "203", name: "Protein", unitName: "g" },
          amount: 4 // 4g per 50g -> 8g / 100g
        },
        {
          nutrient: { id: 1005, number: "205", name: "Carbohydrate, by difference", unitName: "g" },
          amount: 20 // 20g per 50g -> 40g / 100g
        },
        {
          nutrient: { id: 1004, number: "204", name: "Total lipid (fat)", unitName: "g" },
          amount: 1.5 // 1.5g per 50g -> 3g / 100g
        },
        {
          nutrient: { id: 1079, number: "291", name: "Fiber, total dietary", unitName: "g" },
          amount: 3 // 3g per 50g -> 6g / 100g
        }
      ]
    };

    const normalized = normalizeUsdaFoodDetail(rawBranded);

    expect(normalized.sourceDataType).toBe("Branded");
    expect(normalized.brandOwner).toBe("Bakery Brand LLC");

    const cal = normalized.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.CALORIES);
    const pro = normalized.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.PROTEIN);
    const carb = normalized.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.CARBS);
    const fat = normalized.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.FAT);
    const fiber = normalized.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.FIBER);

    expect(cal?.amountPer100g).toBe(220);
    expect(pro?.amountPer100g).toBe(8);
    expect(carb?.amountPer100g).toBe(40);
    expect(fat?.amountPer100g).toBe(3);
    expect(fiber?.amountPer100g).toBe(6);

    const brandedServing = normalized.servings.find((s) => s.sourcePortionId === "branded-serving");
    expect(brandedServing).toBeDefined();
    expect(brandedServing?.gramWeight).toBe(50);
    expect(brandedServing?.description).toBe("1 slice (50g)");
  });

  it("preserves explicit zero nutrients and sets missing nutrients to null without inventing values", () => {
    const rawPartial = {
      fdcId: 123000,
      description: "Egg White, pure",
      dataType: "SR Legacy",
      foodNutrients: [
        {
          nutrient: { id: 1008, number: "208", name: "Energy", unitName: "kcal" },
          amount: 52
        },
        {
          nutrient: { id: 1003, number: "203", name: "Protein", unitName: "g" },
          amount: 10.9
        },
        {
          nutrient: { id: 1004, number: "204", name: "Total lipid (fat)", unitName: "g" },
          amount: 0 // explicit zero
        }
        // Carbs and Fiber are completely omitted from USDA response
      ]
    };

    const normalized = normalizeUsdaFoodDetail(rawPartial);

    const cal = normalized.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.CALORIES);
    const pro = normalized.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.PROTEIN);
    const fat = normalized.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.FAT);
    const carb = normalized.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.CARBS);
    const fiber = normalized.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.FIBER);

    expect(cal?.amountPer100g).toBe(52);
    expect(pro?.amountPer100g).toBe(10.9);
    expect(fat?.amountPer100g).toBe(0); // explicit zero preserved
    expect(carb?.amountPer100g).toBeNull(); // missing preserved as null
    expect(fiber?.amountPer100g).toBeNull(); // missing preserved as null
  });

  it("handles nutrientId / nutrientNumber on flat foodNutrients structures", () => {
    const rawFlat = {
      fdcId: 789123,
      description: "Test Food Flat Structure",
      dataType: "Survey (FNDDS)",
      foodNutrients: [
        {
          nutrientId: 1008,
          nutrientNumber: "208",
          nutrientName: "Energy",
          unitName: "kcal",
          value: 150
        },
        {
          nutrientId: 1003,
          nutrientNumber: "203",
          nutrientName: "Protein",
          unitName: "g",
          value: 12
        }
      ]
    };

    const normalized = normalizeUsdaFoodDetail(rawFlat);
    const cal = normalized.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.CALORIES);
    const pro = normalized.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.PROTEIN);
    const carb = normalized.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.CARBS);

    expect(cal?.amountPer100g).toBe(150);
    expect(pro?.amountPer100g).toBe(12);
    expect(carb?.amountPer100g).toBeNull();
  });

  it("always provides a 100g baseline serving option", () => {
    const rawNoPortions = {
      fdcId: 999999,
      description: "Raw Sugar",
      dataType: "SR Legacy",
      foodNutrients: [
        {
          nutrient: { id: 1008, number: "208", name: "Energy", unitName: "kcal" },
          amount: 387
        }
      ]
    };

    const normalized = normalizeUsdaFoodDetail(rawNoPortions);
    expect(normalized.servings).toEqual([
      {
        sourcePortionId: "100g",
        description: "100 grams",
        gramWeight: 100,
        isDefault: true
      }
    ]);
  });

  it("throws Error on missing fdcId or invalid shape", () => {
    expect(() => normalizeUsdaFoodDetail(null)).toThrow();
    expect(() => normalizeUsdaFoodDetail({})).toThrow();
    expect(() => normalizeUsdaFoodDetail({ fdcId: "not-a-number", description: "Food" })).toThrow();
  });
});

describe("fetchAndNormalizeUsdaFood", () => {
  beforeEach(() => {
    vi.stubEnv("USDA_FDC_API_KEY", "test-key-12345");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("fetches from USDA API and returns normalized food detail", async () => {
    const mockPayload = {
      fdcId: 12345,
      description: "Banana, raw",
      dataType: "Foundation",
      foodNutrients: [
        {
          nutrient: { id: 1008, number: "208", name: "Energy", unitName: "kcal" },
          amount: 89
        },
        {
          nutrient: { id: 1003, number: "203", name: "Protein", unitName: "g" },
          amount: 1.09
        }
      ],
      foodPortions: [
        {
          id: 101,
          gramWeight: 118,
          portionDescription: "1 medium (7\" to 7-7/8\" long)"
        }
      ]
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockPayload
    }) as unknown as typeof fetch;

    try {
      const result = await fetchAndNormalizeUsdaFood("12345");

      expect(result.sourceFoodId).toBe("12345");
      expect(result.description).toBe("Banana, raw");
      const cal = result.nutrients.find((n) => n.nutrientId === CORE_NUTRIENT_IDS.CALORIES);
      expect(cal?.amountPer100g).toBe(89);
      expect(result.servings.find((s) => s.sourcePortionId === "101")?.gramWeight).toBe(118);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("throws FdcProviderError on 404 or 429", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found"
    }) as unknown as typeof fetch;

    try {
      await expect(fetchAndNormalizeUsdaFood("999999")).rejects.toThrow(FdcProviderError);
    } finally {
      globalThis.fetch = originalFetch;
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests"
    }) as unknown as typeof fetch;

    try {
      await expect(fetchAndNormalizeUsdaFood("12345")).rejects.toThrow(FdcProviderError);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("throws FdcConfigurationError if USDA_FDC_API_KEY is not set", async () => {
    vi.stubEnv("USDA_FDC_API_KEY", "");
    await expect(fetchAndNormalizeUsdaFood("12345")).rejects.toThrow(FdcConfigurationError);
  });
});
