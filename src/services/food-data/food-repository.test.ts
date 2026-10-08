import { describe, expect, it, vi } from "vitest";
import { persistCanonicalFood, loadCachedFood, ensureStandardNutrients } from "./food-repository";
import type { CanonicalFoodDetail } from "./food-detail";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Food Repository & Secure RPC Caching (persistCanonicalFood)", () => {
  const sampleCanonical: CanonicalFoodDetail = {
    sourceSystem: "USDA_FDC",
    sourceFoodId: "123456",
    sourceChecksum: "checksum-abc-123456",
    sourceDataType: "Foundation",
    description: "Fresh Gala Apple",
    brandOwner: null,
    foodCategory: "Fruits and Fruit Juices",
    sourceUrl: "https://fdc.nal.usda.gov/food/123456",
    nutrients: [
      {
        nutrientId: "1008",
        name: "Energy",
        unit: "kcal",
        amountPer100g: 52,
        sourceBasis: "per_100g"
      },
      {
        nutrientId: "1003",
        name: "Protein",
        unit: "g",
        amountPer100g: 0.3,
        sourceBasis: "per_100g"
      },
      {
        nutrientId: "1005",
        name: "Carbohydrate, by difference",
        unit: "g",
        amountPer100g: 13.8,
        sourceBasis: "per_100g"
      },
      {
        nutrientId: "1004",
        name: "Total lipid (fat)",
        unit: "g",
        amountPer100g: 0.2,
        sourceBasis: "per_100g"
      },
      {
        nutrientId: "1079",
        name: "Fiber, total dietary",
        unit: "g",
        amountPer100g: 2.4,
        sourceBasis: "per_100g"
      }
    ],
    servings: [
      {
        sourcePortionId: "portion-1",
        description: "1 medium apple (182g)",
        gramWeight: 182,
        isDefault: true
      },
      {
        sourcePortionId: "100g",
        description: "100 grams",
        gramWeight: 100,
        isDefault: false
      }
    ]
  };

  it("successfully delegates caching to the secure cache_canonical_food RPC", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: "f00d-1111-2222-3333-444444444444",
      error: null
    });

    const mockSupabase = {
      rpc: mockRpc
    } as unknown as SupabaseClient;

    const foodId = await persistCanonicalFood(mockSupabase, sampleCanonical);

    expect(foodId).toBe("f00d-1111-2222-3333-444444444444");
    expect(mockRpc).toHaveBeenCalledWith(
      "cache_canonical_food",
      expect.objectContaining({
        p_food: expect.objectContaining({
          source_system: "USDA_FDC",
          source_food_id: "123456",
          source_checksum: "checksum-abc-123456",
          description: "Fresh Gala Apple"
        }),
        p_nutrients: expect.arrayContaining([
          expect.objectContaining({
            nutrient_id: "1008",
            amount_per_100g: 52,
            unit: "kcal"
          })
        ]),
        p_servings: expect.arrayContaining([
          expect.objectContaining({
            source_portion_id: "portion-1",
            gram_weight: 182,
            is_default: true
          })
        ])
      })
    );
  });

  it("is idempotent on repeated cache calls with the same canonical food", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: "f00d-1111-2222-3333-444444444444",
      error: null
    });

    const mockSupabase = {
      rpc: mockRpc
    } as unknown as SupabaseClient;

    const firstId = await persistCanonicalFood(mockSupabase, sampleCanonical);
    const secondId = await persistCanonicalFood(mockSupabase, sampleCanonical);

    expect(firstId).toBe(secondId);
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });

  it("throws clear error when RPC reports an authorization or execution failure", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Authentication is required." }
    });

    const mockSupabase = {
      rpc: mockRpc
    } as unknown as SupabaseClient;

    await expect(persistCanonicalFood(mockSupabase, sampleCanonical)).rejects.toThrow(
      "Failed to cache food record via secure RPC: Authentication is required."
    );
  });

  it("falls back gracefully when cache_canonical_food RPC is not installed in legacy mock", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'function cache_canonical_food() does not exist' }
    });

    const mockFrom = vi.fn((table: string) => {
      if (table === "nutrients") {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null })
        };
      }
      if (table === "foods") {
        return {
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "legacy-fallback-id" },
                error: null
              })
            })
          })
        };
      }
      if (table === "food_nutrients" || table === "food_servings") {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null })
        };
      }
      return {};
    });

    const mockSupabase = {
      rpc: mockRpc,
      from: mockFrom
    } as unknown as SupabaseClient;

    const foodId = await persistCanonicalFood(mockSupabase, sampleCanonical);
    expect(foodId).toBe("legacy-fallback-id");
  });
});
