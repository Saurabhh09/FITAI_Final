import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "../../lib/supabase";
import {
  type BackendMealType,
  type CanonicalFoodDetail,
  type CanonicalFoodNutrient,
  type FoodSearchResult,
  type FoodServingOption,
  VERIFIED_QUICK_FOODS,
} from "./food-domain";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export type LogMealItemPayload = {
  date: string;
  mealType: BackendMealType;
  foodId?: string;
  fdcId?: string;
  quickFoodId?: string;
  quantityGrams: number;
  nameSnapshot: string;
  servingDescription?: string;
};

export type LoggedItemResponse = {
  id: string;
  mealId: string;
  foodId: string;
  name: string;
  serving: string;
  weightGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  mealType: string;
};

const USDA_API_KEY = (
  process.env.EXPO_PUBLIC_USDA_FDC_API_KEY ||
  process.env.USDA_FDC_API_KEY ||
  "rdBjEEna22WpqGGarAHOeUntm397aZIY2TJUfDlX"
).trim();

function parseRawUsdaFood(data: any): CanonicalFoodDetail {
  const fdcId = String(data.fdcId || data.id || "");
  const description = String(data.description || "Unknown Food");
  const brandOwner = data.brandOwner ? String(data.brandOwner) : null;
  const foodCategory = data.foodCategory || data.brandedFoodCategory || null;

  const rawNutrients = Array.isArray(data.foodNutrients) ? data.foodNutrients : [];
  const servingSize =
    typeof data.servingSize === "number" && data.servingSize > 0 ? data.servingSize : null;

  const nutrientMap = new Map<string, number>();
  for (const item of rawNutrients) {
    const n = item.nutrient || {};
    const id = String(n.id || item.nutrientId || "");
    const num = String(n.number || item.nutrientNumber || "");
    const val = Number(item.amount ?? item.value ?? 0);

    if (id === "1008" || num === "208") nutrientMap.set("1008", val);
    else if (id === "1003" || num === "203") nutrientMap.set("1003", val);
    else if (id === "1005" || num === "205") nutrientMap.set("1005", val);
    else if (id === "1004" || num === "204") nutrientMap.set("1004", val);
    else if (id === "1079" || num === "291") nutrientMap.set("1079", val);
  }

  const nutrients: CanonicalFoodNutrient[] = [
    { nutrientId: "1008", name: "Energy", unit: "kcal", amountPer100g: nutrientMap.get("1008") ?? 0 },
    { nutrientId: "1003", name: "Protein", unit: "g", amountPer100g: nutrientMap.get("1003") ?? 0 },
    { nutrientId: "1005", name: "Carbohydrate, by difference", unit: "g", amountPer100g: nutrientMap.get("1005") ?? 0 },
    { nutrientId: "1004", name: "Total lipid (fat)", unit: "g", amountPer100g: nutrientMap.get("1004") ?? 0 },
    { nutrientId: "1079", name: "Fiber, total dietary", unit: "g", amountPer100g: nutrientMap.get("1079") ?? 0 },
  ];

  const servings: FoodServingOption[] = [];
  if (servingSize) {
    const desc = data.householdServingFullText
      ? `${data.householdServingFullText} (${Math.round(servingSize)}g)`
      : `1 serving (${Math.round(servingSize)}g)`;
    servings.push({
      sourcePortionId: "serving",
      description: desc,
      gramWeight: servingSize,
      isDefault: true,
    });
  }

  if (Array.isArray(data.foodPortions)) {
    for (const p of data.foodPortions) {
      const g = Number(p.gramWeight);
      if (g > 0) {
        const desc = p.portionDescription || `${p.amount || 1} ${p.modifier || "portion"} (${Math.round(g)}g)`;
        servings.push({
          sourcePortionId: String(p.id || desc),
          description: desc,
          gramWeight: g,
          isDefault: servings.length === 0,
        });
      }
    }
  }

  servings.push({
    sourcePortionId: "100g",
    description: "100 grams",
    gramWeight: 100,
    isDefault: servings.length === 0,
  });

  return {
    sourceSystem: "USDA_FDC",
    sourceFoodId: fdcId,
    description,
    brandOwner,
    foodCategory,
    nutrients,
    servings,
  };
}

/**
 * Searches for foods directly against USDA FoodData Central or cached Supabase foods.
 */
export async function searchFoodsApi(
  query: string,
  _accessToken?: string,
  limit = 15,
  supabaseClient?: SupabaseClient
): Promise<ApiResult<FoodSearchResult[]>> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "Search query must be at least 2 characters." };
  }

  // 1. First, search USDA FoodData Central directly
  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(USDA_API_KEY)}&query=${encodeURIComponent(trimmed)}&pageSize=${limit}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (Array.isArray(data?.foods) && data.foods.length > 0) {
        const results: FoodSearchResult[] = data.foods.slice(0, limit).map((f: any) => ({
          source: "USDA FoodData Central" as const,
          sourceId: String(f.fdcId),
          sourceUrl: `https://fdc.nal.usda.gov/food-details/${f.fdcId}/nutrients`,
          description: f.description || "Unknown Food",
          dataType: f.dataType || "Foundation",
          brandOwner: f.brandOwner || null,
          foodCategory: f.foodCategory || f.brandedFoodCategory || null,
        }));
        return { ok: true, data: results };
      }
    }
  } catch {
    // Proceed to fallback
  }

  // 2. Fallback: Search existing verified foods in Supabase
  try {
    const supabase = supabaseClient || getSupabase();
    const { data: localFoods } = await supabase
      .from("foods")
      .select("id, source_system, source_food_id, description, brand_owner, food_category")
      .ilike("description", `%${trimmed}%`)
      .limit(limit);

    if (Array.isArray(localFoods) && localFoods.length > 0) {
      const mapped: FoodSearchResult[] = localFoods.map((f: any) => ({
        source: "USDA FoodData Central" as const,
        sourceId: f.source_food_id.replace(/^quick:/, ""),
        sourceUrl: "https://fdc.nal.usda.gov/",
        description: f.description,
        dataType: f.source_system === "OTHER_VERIFIED" ? "Verified Standard" : "Foundation",
        brandOwner: f.brand_owner,
        foodCategory: f.food_category,
      }));
      return { ok: true, data: mapped };
    }
  } catch {
    // Ignore fallback errors
  }

  return { ok: true, data: [] };
}

/**
 * Retrieves full food nutrients and portion options.
 * Checks Supabase cache first, falling back to USDA directly.
 */
export async function fetchFoodDetailApi(
  fdcId: string,
  _accessToken?: string,
  supabaseClient?: SupabaseClient
): Promise<ApiResult<CanonicalFoodDetail>> {
  const trimmed = fdcId.trim();
  if (!trimmed) {
    return { ok: false, error: "Food identifier is required." };
  }

  // 1. Check if already cached in Supabase
  try {
    const supabase = supabaseClient || getSupabase();
    const { data: foodRow } = await supabase
      .from("foods")
      .select(`
        id,
        source_system,
        source_food_id,
        description,
        brand_owner,
        food_category,
        food_nutrients (nutrient_id, amount_per_100g, unit),
        food_servings (source_portion_id, description, gram_weight, is_default)
      `)
      .eq("source_food_id", trimmed)
      .maybeSingle();

    if (foodRow && Array.isArray(foodRow.food_nutrients) && foodRow.food_nutrients.length > 0) {
      const nutrients = foodRow.food_nutrients.map((fn: any) => ({
        nutrientId: fn.nutrient_id,
        name:
          fn.nutrient_id === "1008"
            ? "Energy"
            : fn.nutrient_id === "1003"
            ? "Protein"
            : fn.nutrient_id === "1005"
            ? "Carbohydrate, by difference"
            : fn.nutrient_id === "1004"
            ? "Total lipid (fat)"
            : "Fiber, total dietary",
        unit: fn.unit,
        amountPer100g: Number(fn.amount_per_100g),
      }));

      const rawServings = Array.isArray(foodRow.food_servings) ? foodRow.food_servings : [];
      const servings = rawServings.map((s: any) => ({
        sourcePortionId: s.source_portion_id || "default",
        description: s.description,
        gramWeight: Number(s.gram_weight),
        isDefault: Boolean(s.is_default),
      }));

      return {
        ok: true,
        data: {
          id: foodRow.id,
          sourceSystem: foodRow.source_system as any,
          sourceFoodId: foodRow.source_food_id,
          description: foodRow.description,
          brandOwner: foodRow.brand_owner,
          foodCategory: foodRow.food_category,
          nutrients,
          servings:
            servings.length > 0
              ? servings
              : [{ sourcePortionId: "100g", description: "100 grams", gramWeight: 100, isDefault: true }],
        },
      };
    }
  } catch {
    // Proceed to USDA API fetch
  }

  // 2. Fetch directly from USDA FoodData Central
  try {
    const url = `https://api.nal.usda.gov/fdc/v1/food/${encodeURIComponent(trimmed)}?api_key=${encodeURIComponent(USDA_API_KEY)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return { ok: false, error: `USDA food detail request returned ${res.status}.` };
    }

    const data = await res.json().catch(() => null);
    if (!data) {
      return { ok: false, error: "Food details not found in response." };
    }

    const parsed = parseRawUsdaFood(data);
    return { ok: true, data: parsed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to connect to food detail service.";
    return { ok: false, error: msg };
  }
}

/**
 * Logs a food or quick food item to a meal directly in Supabase.
 * Operates independently on mobile via RLS without requiring a desktop web server.
 */
export async function logMealItemApi(
  payload: LogMealItemPayload,
  _accessToken?: string,
  supabaseClient?: SupabaseClient
): Promise<ApiResult<LoggedItemResponse>> {
  try {
    const supabase = supabaseClient || getSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Authentication required to log meals.", status: 401 };
    }

    let resolvedFoodId = payload.foodId;

    // 1. Resolve quick food if quickFoodId is supplied
    if (!resolvedFoodId && payload.quickFoodId) {
      const definition = VERIFIED_QUICK_FOODS.find((f) => f.id === payload.quickFoodId);
      if (!definition) {
        return { ok: false, error: `Quick food not found: ${payload.quickFoodId}` };
      }

      // Check if already in foods table
      const { data: existing } = await supabase
        .from("foods")
        .select("id")
        .eq("source_system", "OTHER_VERIFIED")
        .eq("source_food_id", `quick:${definition.id}`)
        .maybeSingle();

      if (existing?.id) {
        resolvedFoodId = existing.id;
      } else {
        const per100Multiplier = 100 / definition.grams;
        const payloadFood = {
          source_system: "OTHER_VERIFIED",
          source_food_id: `quick:${definition.id}`,
          source_checksum: `quick-v1-${definition.id}`,
          source_data_type: "Verified Standard",
          description: definition.name,
          brand_owner: null,
          food_category: "Quick Foods",
          source_url: "https://fdc.nal.usda.gov/",
        };

        const payloadNutrients = [
          {
            nutrient_id: "1008",
            name: "Energy",
            unit: "kcal",
            amount_per_100g: Math.round(definition.cal * per100Multiplier * 10) / 10,
            source_basis: "verified_portion",
            category: "Energy",
          },
          {
            nutrient_id: "1003",
            name: "Protein",
            unit: "g",
            amount_per_100g: Math.round(definition.p * per100Multiplier * 10) / 10,
            source_basis: "verified_portion",
            category: "Macronutrients",
          },
          {
            nutrient_id: "1005",
            name: "Carbohydrate, by difference",
            unit: "g",
            amount_per_100g: Math.round(definition.c * per100Multiplier * 10) / 10,
            source_basis: "verified_portion",
            category: "Macronutrients",
          },
          {
            nutrient_id: "1004",
            name: "Total lipid (fat)",
            unit: "g",
            amount_per_100g: Math.round(definition.f * per100Multiplier * 10) / 10,
            source_basis: "verified_portion",
            category: "Macronutrients",
          },
          {
            nutrient_id: "1079",
            name: "Fiber, total dietary",
            unit: "g",
            amount_per_100g: Math.round((definition.fiber ?? 0) * per100Multiplier * 10) / 10,
            source_basis: "verified_portion",
            category: "Macronutrients",
          },
        ];

        const payloadServings = [
          {
            source_portion_id: "default",
            description: definition.serving,
            gram_weight: definition.grams,
            is_default: true,
          },
        ];

        const { data: cachedId, error: rpcError } = await supabase.rpc("cache_canonical_food", {
          p_food: payloadFood,
          p_nutrients: payloadNutrients,
          p_servings: payloadServings,
        });

        if (rpcError || !cachedId) {
          // If RPC is missing in mock or environment, check existing again
          const { data: retry } = await supabase
            .from("foods")
            .select("id")
            .eq("source_system", "OTHER_VERIFIED")
            .eq("source_food_id", `quick:${definition.id}`)
            .maybeSingle();

          if (retry?.id) {
            resolvedFoodId = retry.id;
          } else {
            return {
              ok: false,
              error: rpcError?.message || "Could not register quick food item.",
            };
          }
        } else {
          resolvedFoodId = cachedId as string;
        }
      }
    }

    // 2. Resolve USDA food if fdcId is supplied
    if (!resolvedFoodId && payload.fdcId) {
      const { data: cachedUsda } = await supabase
        .from("foods")
        .select("id")
        .eq("source_system", "USDA_FDC")
        .eq("source_food_id", payload.fdcId)
        .maybeSingle();

      if (cachedUsda?.id) {
        resolvedFoodId = cachedUsda.id;
      } else {
        const detailResult = await fetchFoodDetailApi(payload.fdcId, undefined, supabase);
        if (!detailResult.ok) {
          return { ok: false, error: detailResult.error };
        }

        const canonical = detailResult.data;
        const payloadFood = {
          source_system: "USDA_FDC",
          source_food_id: canonical.sourceFoodId,
          source_checksum: `usda-fdc-${canonical.sourceFoodId}`,
          source_data_type: "Foundation",
          description: canonical.description.slice(0, 500),
          brand_owner: canonical.brandOwner,
          food_category: canonical.foodCategory,
          source_url: `https://fdc.nal.usda.gov/food-details/${canonical.sourceFoodId}/nutrients`,
        };

        const payloadNutrients = canonical.nutrients.map((n) => ({
          nutrient_id: n.nutrientId,
          name: n.name,
          unit: n.unit,
          amount_per_100g: n.amountPer100g ?? 0,
          source_basis: "per_100g",
          category: n.nutrientId === "1008" ? "Energy" : "Macronutrients",
        }));

        const payloadServings = canonical.servings.map((s) => ({
          source_portion_id: s.sourcePortionId,
          description: s.description.slice(0, 250),
          gram_weight: s.gramWeight,
          is_default: s.isDefault,
        }));

        const { data: cachedId, error: rpcError } = await supabase.rpc("cache_canonical_food", {
          p_food: payloadFood,
          p_nutrients: payloadNutrients,
          p_servings: payloadServings,
        });

        if (rpcError || !cachedId) {
          return { ok: false, error: rpcError?.message || "Could not cache USDA food item." };
        }
        resolvedFoodId = cachedId as string;
      }
    }

    if (!resolvedFoodId) {
      return { ok: false, error: "Could not resolve food record." };
    }

    // 3. Find or create the meal container
    let mealId: string;
    const { data: existingMeal } = await supabase
      .from("meals")
      .select("id")
      .eq("user_id", user.id)
      .eq("logged_for", payload.date)
      .eq("meal_type", payload.mealType)
      .maybeSingle();

    if (existingMeal?.id) {
      mealId = existingMeal.id;
    } else {
      const { data: newMeal, error: mealError } = await supabase
        .from("meals")
        .insert({
          user_id: user.id,
          logged_for: payload.date,
          meal_type: payload.mealType,
        })
        .select("id")
        .single();

      if (mealError || !newMeal) {
        return { ok: false, error: mealError?.message || "Could not create meal log." };
      }
      mealId = newMeal.id;
    }

    // 4. Insert meal_items row
    const { data: mealItem, error: itemError } = await supabase
      .from("meal_items")
      .insert({
        meal_id: mealId,
        user_id: user.id,
        food_id: resolvedFoodId,
        item_name_snapshot: payload.nameSnapshot,
        quantity_grams: payload.quantityGrams,
      })
      .select("id, created_at")
      .single();

    if (itemError || !mealItem) {
      return { ok: false, error: itemError?.message || "Could not save meal item." };
    }

    // 5. Query food_nutrients to compute response totals
    const { data: nutrientsData } = await supabase
      .from("food_nutrients")
      .select("nutrient_id, amount_per_100g, unit")
      .eq("food_id", resolvedFoodId);

    let cal = 0;
    let p = 0;
    let c = 0;
    let f = 0;
    let fib = 0;
    const mult = payload.quantityGrams / 100;

    for (const n of (nutrientsData || []) as any[]) {
      const amt = Number(n.amount_per_100g) || 0;
      if (n.nutrient_id === "1008") cal = amt * mult;
      else if (n.nutrient_id === "1003") p = amt * mult;
      else if (n.nutrient_id === "1005") c = amt * mult;
      else if (n.nutrient_id === "1004") f = amt * mult;
      else if (n.nutrient_id === "1079") fib = amt * mult;
    }

    const displayMealType =
      payload.mealType === "breakfast"
        ? "Breakfast"
        : payload.mealType === "lunch"
        ? "Lunch"
        : payload.mealType === "dinner"
        ? "Dinner"
        : "Snacks";

    return {
      ok: true,
      data: {
        id: mealItem.id,
        mealId,
        foodId: resolvedFoodId,
        name: payload.nameSnapshot,
        serving: payload.servingDescription || `${Math.round(payload.quantityGrams)}g`,
        weightGrams: payload.quantityGrams,
        calories: Math.round(cal),
        protein: Math.round(p * 10) / 10,
        carbs: Math.round(c * 10) / 10,
        fat: Math.round(f * 10) / 10,
        fiber: Math.round(fib * 10) / 10,
        mealType: displayMealType,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to connect to meal logging service.";
    return { ok: false, error: msg };
  }
}

export type LogScannedMealPayload = {
  date: string;
  mealType: BackendMealType;
  mealName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  totalWeightGrams?: number;
};

/**
 * Logs an AI scanned meal directly to the user's diary in Supabase.
 * Registers canonical nutrients in food_nutrients so dashboard totals and macro rings calculate accurately.
 */
export async function logScannedMealToDiaryApi(
  payload: LogScannedMealPayload,
  _accessToken?: string,
  supabaseClient?: SupabaseClient
): Promise<ApiResult<LoggedItemResponse>> {
  try {
    const supabase = supabaseClient || getSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Authentication required to log meals.", status: 401 };
    }

    const weightGrams =
      payload.totalWeightGrams && payload.totalWeightGrams > 0 ? payload.totalWeightGrams : 250;
    const per100Multiplier = 100 / weightGrams;

    const calPer100 = Math.round(payload.calories * per100Multiplier * 10) / 10;
    const pPer100 = Math.round(payload.protein * per100Multiplier * 10) / 10;
    const cPer100 = Math.round(payload.carbs * per100Multiplier * 10) / 10;
    const fPer100 = Math.round(payload.fat * per100Multiplier * 10) / 10;
    const fibPer100 = Math.round((payload.fiber ?? 0) * per100Multiplier * 10) / 10;

    const scanFoodId = `scan:${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // 1. Register canonical food in foods & food_nutrients via cache_canonical_food RPC
    let resolvedFoodId: string | null = null;
    const payloadFood = {
      source_system: "OTHER_VERIFIED",
      source_food_id: scanFoodId,
      source_checksum: `scan-${Date.now()}`,
      source_data_type: "AI Scan",
      description: payload.mealName,
      brand_owner: null,
      food_category: "Scanned Meals",
      source_url: "https://fitai.app/scan",
    };

    const payloadNutrients = [
      {
        nutrient_id: "1008",
        name: "Energy",
        unit: "kcal",
        amount_per_100g: calPer100,
        source_basis: "ai_scan",
        category: "Energy",
      },
      {
        nutrient_id: "1003",
        name: "Protein",
        unit: "g",
        amount_per_100g: pPer100,
        source_basis: "ai_scan",
        category: "Macronutrients",
      },
      {
        nutrient_id: "1005",
        name: "Carbohydrate, by difference",
        unit: "g",
        amount_per_100g: cPer100,
        source_basis: "ai_scan",
        category: "Macronutrients",
      },
      {
        nutrient_id: "1004",
        name: "Total lipid (fat)",
        unit: "g",
        amount_per_100g: fPer100,
        source_basis: "ai_scan",
        category: "Macronutrients",
      },
      {
        nutrient_id: "1079",
        name: "Fiber, total dietary",
        unit: "g",
        amount_per_100g: fibPer100,
        source_basis: "ai_scan",
        category: "Macronutrients",
      },
    ];

    const payloadServings = [
      {
        source_portion_id: "default",
        description: `${Math.round(weightGrams)}g portion`,
        gram_weight: weightGrams,
        is_default: true,
      },
    ];

    const { data: cachedId, error: rpcError } = await supabase.rpc("cache_canonical_food", {
      p_food: payloadFood,
      p_nutrients: payloadNutrients,
      p_servings: payloadServings,
    });

    if (cachedId) {
      resolvedFoodId = cachedId as string;
    } else {
      // Fallback: direct insert into foods and food_nutrients
      const { data: insertedFood, error: foodInsertErr } = await supabase
        .from("foods")
        .insert({
          source_system: "OTHER_VERIFIED",
          source_food_id: scanFoodId,
          source_checksum: `scan-${Date.now()}`,
          source_data_type: "AI Scan",
          description: payload.mealName,
          food_category: "Scanned Meals",
          source_url: "https://fitai.app/scan",
        })
        .select("id")
        .single();

      if (foodInsertErr || !insertedFood) {
        return {
          ok: false,
          error: foodInsertErr?.message || rpcError?.message || "Could not register scanned food.",
        };
      }

      resolvedFoodId = insertedFood.id;
      await supabase.from("food_nutrients").insert([
        { food_id: resolvedFoodId, nutrient_id: "1008", amount_per_100g: calPer100, unit: "kcal" },
        { food_id: resolvedFoodId, nutrient_id: "1003", amount_per_100g: pPer100, unit: "g" },
        { food_id: resolvedFoodId, nutrient_id: "1005", amount_per_100g: cPer100, unit: "g" },
        { food_id: resolvedFoodId, nutrient_id: "1004", amount_per_100g: fPer100, unit: "g" },
        { food_id: resolvedFoodId, nutrient_id: "1079", amount_per_100g: fibPer100, unit: "g" },
      ]);
    }

    if (!resolvedFoodId) {
      return { ok: false, error: "Could not resolve food record for scanned meal." };
    }

    // 2. Find or create the meal container
    let mealId: string;
    const { data: existingMeal } = await supabase
      .from("meals")
      .select("id")
      .eq("user_id", user.id)
      .eq("logged_for", payload.date)
      .eq("meal_type", payload.mealType)
      .maybeSingle();

    if (existingMeal?.id) {
      mealId = existingMeal.id;
    } else {
      const { data: newMeal, error: mealError } = await supabase
        .from("meals")
        .insert({
          user_id: user.id,
          logged_for: payload.date,
          meal_type: payload.mealType,
        })
        .select("id")
        .single();

      if (mealError || !newMeal) {
        return { ok: false, error: mealError?.message || "Could not create meal log." };
      }
      mealId = newMeal.id;
    }

    // 3. Insert meal_items row
    const { data: mealItem, error: itemError } = await supabase
      .from("meal_items")
      .insert({
        meal_id: mealId,
        user_id: user.id,
        food_id: resolvedFoodId,
        item_name_snapshot: payload.mealName,
        quantity_grams: weightGrams,
      })
      .select("id, created_at")
      .single();

    if (itemError || !mealItem) {
      return { ok: false, error: itemError?.message || "Could not save meal item." };
    }

    const displayMealType =
      payload.mealType === "breakfast"
        ? "Breakfast"
        : payload.mealType === "lunch"
        ? "Lunch"
        : payload.mealType === "dinner"
        ? "Dinner"
        : "Snacks";

    return {
      ok: true,
      data: {
        id: mealItem.id,
        mealId,
        foodId: resolvedFoodId,
        name: payload.mealName,
        serving: `${Math.round(weightGrams)}g`,
        weightGrams,
        calories: Math.round(payload.calories),
        protein: Math.round(payload.protein * 10) / 10,
        carbs: Math.round(payload.carbs * 10) / 10,
        fat: Math.round(payload.fat * 10) / 10,
        fiber: Math.round((payload.fiber ?? 0) * 10) / 10,
        mealType: displayMealType,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to connect to meal logging service.";
    return { ok: false, error: msg };
  }
}

/**
 * Deletes a logged meal item directly from Supabase.
 * Operates independently on mobile via RLS without requiring a desktop web server.
 */
export async function deleteMealItemApi(
  itemId: string,
  _accessToken?: string,
  supabaseClient?: SupabaseClient
): Promise<ApiResult<string>> {
  const trimmed = itemId.trim();
  if (!trimmed) {
    return { ok: false, error: "Item ID is required." };
  }

  try {
    const supabase = supabaseClient || getSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Authentication required.", status: 401 };
    }

    const { error: dbError } = await supabase
      .from("meal_items")
      .delete()
      .eq("id", trimmed);

    if (dbError) {
      return { ok: false, error: dbError.message || "Could not delete meal item." };
    }

    return { ok: true, data: trimmed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to connect to meal delete service.";
    return { ok: false, error: msg };
  }
}
