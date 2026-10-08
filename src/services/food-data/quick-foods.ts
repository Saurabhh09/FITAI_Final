import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { type CanonicalFoodDetail, CORE_NUTRIENT_IDS } from "./food-detail";
import { persistCanonicalFood } from "./food-repository";

export type QuickFoodDefinition = {
  id: string;
  name: string;
  serving: string;
  grams: number;
  cal: number;
  p: number;
  c: number;
  f: number;
  fiber?: number;
  emoji?: string;
};

export const VERIFIED_QUICK_FOODS: QuickFoodDefinition[] = [
  { id: "banana", name: "Banana", serving: "1 medium (118g)", grams: 118, cal: 105, p: 1.3, c: 27, f: 0.4, fiber: 3.1, emoji: "🍌" },
  { id: "apple", name: "Apple", serving: "1 medium (182g)", grams: 182, cal: 95, p: 0.5, c: 25, f: 0.3, fiber: 4.4, emoji: "🍎" },
  { id: "oats", name: "Rolled Oats", serving: "1 bowl (50g oats)", grams: 50, cal: 195, p: 8.5, c: 33, f: 3.5, fiber: 5.3, emoji: "🥣" },
  { id: "milk", name: "Whole Milk", serving: "1 glass (240ml)", grams: 240, cal: 149, p: 7.7, c: 11.7, f: 8.0, fiber: 0, emoji: "🥛" },
  { id: "egg", name: "Boiled Eggs", serving: "2 large eggs (100g)", grams: 100, cal: 155, p: 13.0, c: 1.1, f: 11.0, fiber: 0, emoji: "🥚" },
  { id: "roti", name: "Whole Wheat Roti", serving: "2 rotis (70g)", grams: 70, cal: 208, p: 6.7, c: 40.6, f: 2.6, fiber: 6.3, emoji: "🫓" },
  { id: "rice", name: "Basmati Rice", serving: "1 cup cooked (150g)", grams: 150, cal: 195, p: 4.1, c: 42.3, f: 0.5, fiber: 0.6, emoji: "🍚" },
  { id: "dal", name: "Yellow Dal / Lentils", serving: "1 bowl (180g)", grams: 180, cal: 189, p: 12.2, c: 27.4, f: 3.8, fiber: 8.1, emoji: "🍲" },
  { id: "paneer", name: "Fresh Paneer", serving: "100g serving", grams: 100, cal: 265, p: 18.3, c: 3.6, f: 20.8, fiber: 0, emoji: "🧀" },
  { id: "curd", name: "Greek Yogurt / Curd", serving: "1 cup (150g)", grams: 150, cal: 145, p: 13.5, c: 5.4, f: 7.5, fiber: 0, emoji: "🥣" },
  { id: "chicken", name: "Grilled Chicken Breast", serving: "1 breast (150g)", grams: 150, cal: 248, p: 46.5, c: 0, f: 5.4, fiber: 0, emoji: "🍗" },
  { id: "salad", name: "Garden Salad", serving: "1 bowl (150g)", grams: 150, cal: 38, p: 2.3, c: 6.8, f: 0.3, fiber: 3.3, emoji: "🥗" },
  { id: "poha", name: "Flattened Rice Poha", serving: "1 bowl (160g)", grams: 160, cal: 256, p: 5.1, c: 44.8, f: 6.4, fiber: 2.9, emoji: "🍛" },
  { id: "idli", name: "Steamed Idli", serving: "2 pieces (100g)", grams: 100, cal: 135, p: 4.2, c: 28.0, f: 0.6, fiber: 2.1, emoji: "🍚" },
  { id: "almonds", name: "California Almonds", serving: "1 handful (30g)", grams: 30, cal: 174, p: 6.4, c: 6.5, f: 15.0, fiber: 3.8, emoji: "🥜" },
  { id: "protein_shake", name: "Whey Protein Shake", serving: "1 scoop (35g)", grams: 35, cal: 133, p: 25.9, c: 3.2, f: 1.8, fiber: 0.4, emoji: "🥤" },
  { id: "peanut_butter", name: "Natural Peanut Butter", serving: "2 tbsp (32g)", grams: 32, cal: 188, p: 8.0, c: 6.4, f: 16.1, fiber: 1.9, emoji: "🥜" }
];

export async function resolveOrPersistQuickFood(
  supabase: SupabaseClient,
  quickFoodId: string
): Promise<string> {
  const definition = VERIFIED_QUICK_FOODS.find((f) => f.id === quickFoodId);
  if (!definition) throw new Error(`Quick food not found: ${quickFoodId}`);

  // Check if already in public.foods
  const { data: existing } = await supabase
    .from("foods")
    .select("id")
    .eq("source_system", "OTHER_VERIFIED")
    .eq("source_food_id", `quick:${definition.id}`)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const per100Multiplier = 100 / definition.grams;

  const canonical: CanonicalFoodDetail = {
    sourceSystem: "OTHER_VERIFIED",
    sourceFoodId: `quick:${definition.id}`,
    sourceChecksum: `quick-v1-${definition.id}`,
    sourceDataType: "Verified Standard",
    description: definition.name,
    brandOwner: null,
    foodCategory: "Quick Foods",
    sourceUrl: "https://fdc.nal.usda.gov/",
    nutrients: [
      {
        nutrientId: CORE_NUTRIENT_IDS.CALORIES,
        name: "Energy",
        unit: "kcal",
        amountPer100g: Math.round(definition.cal * per100Multiplier * 10) / 10,
        sourceBasis: "verified_portion"
      },
      {
        nutrientId: CORE_NUTRIENT_IDS.PROTEIN,
        name: "Protein",
        unit: "g",
        amountPer100g: Math.round(definition.p * per100Multiplier * 10) / 10,
        sourceBasis: "verified_portion"
      },
      {
        nutrientId: CORE_NUTRIENT_IDS.CARBS,
        name: "Carbohydrate, by difference",
        unit: "g",
        amountPer100g: Math.round(definition.c * per100Multiplier * 10) / 10,
        sourceBasis: "verified_portion"
      },
      {
        nutrientId: CORE_NUTRIENT_IDS.FAT,
        name: "Total lipid (fat)",
        unit: "g",
        amountPer100g: Math.round(definition.f * per100Multiplier * 10) / 10,
        sourceBasis: "verified_portion"
      },
      {
        nutrientId: CORE_NUTRIENT_IDS.FIBER,
        name: "Fiber, total dietary",
        unit: "g",
        amountPer100g: Math.round((definition.fiber ?? 0) * per100Multiplier * 10) / 10,
        sourceBasis: "verified_portion"
      }
    ],
    servings: [
      {
        sourcePortionId: "portion-1",
        description: definition.serving,
        gramWeight: definition.grams,
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

  return await persistCanonicalFood(supabase, canonical);
}
