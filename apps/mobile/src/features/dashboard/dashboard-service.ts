import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CORE_NUTRIENT_IDS,
  calculateDailyNutritionTotals,
  computeRolloverKcal,
  getYesterdayISO,
  groupMealItemsIntoBuckets,
  mapDbMealType,
  type ConsumedTotals,
  type DashboardNutritionProfile,
  type LoggedMealBucket,
  type LoggedMealItem,
} from "./dashboard-domain";

export type RawMealQueryItem = {
  id: string;
  item_name_snapshot: string;
  quantity_grams: number | string;
  food_id: string | null;
  foods?: {
    food_nutrients?: Array<{
      nutrient_id: string;
      amount_per_100g: number | string | null;
      unit: string;
    }> | null;
  } | null;
};

export type RawMealQueryRow = {
  id: string;
  logged_for: string;
  meal_type: string;
  meal_items: RawMealQueryItem[] | null;
};

export type MobileDashboardData = {
  profile: DashboardNutritionProfile;
  selectedDate: string;
  mealBuckets: LoggedMealBucket[];
  allMealItems: LoggedMealItem[];
  consumedTotals: ConsumedTotals;
  waterMl: number;
  rolloverKcal: number;
  availableCalories: number;
  caloriesRemaining: number;
  latestWeightKg: number | null;
  latestWeightDate: string | null;
};

export type DashboardQueryResult =
  | { ok: true; data: MobileDashboardData }
  | { ok: false; error: string; code?: "NO_PROFILE" | "QUERY_ERROR" | "UNAUTHENTICATED" };

function parseMealItemNutrients(item: RawMealQueryItem, mealType: string): LoggedMealItem {
  const quantityGrams = Number(item.quantity_grams) || 0;
  const rawNutrients = item.foods?.food_nutrients || [];

  let cal = 0;
  let p = 0;
  let c = 0;
  let f = 0;
  let fib = 0;

  for (const fn of rawNutrients) {
    const amountPer100g = Number(fn.amount_per_100g) || 0;
    const scaled = amountPer100g * (quantityGrams / 100);

    if (fn.nutrient_id === CORE_NUTRIENT_IDS.CALORIES) cal += scaled;
    else if (fn.nutrient_id === CORE_NUTRIENT_IDS.PROTEIN) p += scaled;
    else if (fn.nutrient_id === CORE_NUTRIENT_IDS.CARBS) c += scaled;
    else if (fn.nutrient_id === CORE_NUTRIENT_IDS.FAT) f += scaled;
    else if (fn.nutrient_id === CORE_NUTRIENT_IDS.FIBER) fib += scaled;
  }

  return {
    id: item.id,
    name: item.item_name_snapshot,
    serving: `${Math.round(quantityGrams)}g`,
    weightGrams: quantityGrams,
    calories: Math.round(cal),
    protein: Math.round(p * 10) / 10,
    carbs: Math.round(c * 10) / 10,
    fat: Math.round(f * 10) / 10,
    fiber: Math.round(fib * 10) / 10,
    mealType: mapDbMealType(mealType),
  };
}

/**
 * Loads dashboard data for the authenticated user and selected date from Supabase.
 * Respects RLS and uses real database records.
 */
export async function fetchDashboardData(
  supabase: SupabaseClient,
  userId: string,
  selectedDate: string
): Promise<DashboardQueryResult> {
  if (!userId) {
    return { ok: false, error: "User session required to load dashboard.", code: "UNAUTHENTICATED" };
  }

  const yesterdayDate = getYesterdayISO(selectedDate);

  try {
    const [profileRes, userProfileRes, hydrationRes, mealsRes, weightRes] = await Promise.all([
      supabase
        .from("user_nutrition_profiles")
        .select(`
          target_calories,
          target_protein_grams,
          target_carbs_grams,
          target_fat_grams,
          target_fiber_grams,
          target_water_ml,
          weight_kg,
          target_weight_kg,
          goal,
          calorie_rollover
        `)
        .eq("user_id", userId)
        .maybeSingle(),

      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle(),

      supabase
        .from("hydration_logs")
        .select("volume_ml")
        .eq("user_id", userId)
        .eq("local_date", selectedDate)
        .maybeSingle(),

      supabase
        .from("meals")
        .select(`
          id,
          logged_for,
          meal_type,
          meal_items (
            id,
            item_name_snapshot,
            quantity_grams,
            food_id,
            foods (
              food_nutrients (
                nutrient_id,
                amount_per_100g,
                unit
              )
            )
          )
        `)
        .eq("user_id", userId)
        .in("logged_for", [selectedDate, yesterdayDate])
        .order("created_at", { ascending: true }),

      supabase
        .from("weight_entries")
        .select("weight_kg, recorded_at")
        .eq("user_id", userId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (profileRes.error) {
      return { ok: false, error: profileRes.error.message, code: "QUERY_ERROR" };
    }

    if (!profileRes.data) {
      return { ok: false, error: "No nutrition profile found for this user.", code: "NO_PROFILE" };
    }

    if (mealsRes.error) {
      return { ok: false, error: mealsRes.error.message, code: "QUERY_ERROR" };
    }

    const np = profileRes.data;
    const profile: DashboardNutritionProfile = {
      targetCalories: Number(np.target_calories),
      targetProteinGrams: Number(np.target_protein_grams),
      targetCarbsGrams: Number(np.target_carbs_grams),
      targetFatGrams: Number(np.target_fat_grams),
      targetFiberGrams: Number(np.target_fiber_grams),
      targetWaterMl: Number(np.target_water_ml),
      calorieRollover: Boolean(np.calorie_rollover),
      goal: np.goal || "maintain",
      weightKg: Number(np.weight_kg),
      targetWeightKg: np.target_weight_kg !== null ? Number(np.target_weight_kg) : null,
      displayName: userProfileRes.data?.display_name || "Friend",
    };

    const waterMl = Number(hydrationRes.data?.volume_ml) || 0;
    const latestWeightKg = (weightRes && "data" in weightRes && weightRes.data?.weight_kg != null)
      ? Number(weightRes.data.weight_kg)
      : null;
    const latestWeightDate = (weightRes && "data" in weightRes && weightRes.data?.recorded_at) || null;

    // Separate meals for selectedDate and yesterdayDate
    const rawMeals = (mealsRes.data as unknown as RawMealQueryRow[]) || [];
    const selectedDayItems: LoggedMealItem[] = [];
    const yesterdayItems: Array<{ calories: number }> = [];

    for (const mealRow of rawMeals) {
      const items = Array.isArray(mealRow.meal_items) ? mealRow.meal_items : [];

      if (mealRow.logged_for === selectedDate) {
        for (const item of items) {
          selectedDayItems.push(parseMealItemNutrients(item, mealRow.meal_type));
        }
      } else if (mealRow.logged_for === yesterdayDate) {
        for (const item of items) {
          const parsed = parseMealItemNutrients(item, mealRow.meal_type);
          yesterdayItems.push({ calories: parsed.calories });
        }
      }
    }

    const consumedTotals = calculateDailyNutritionTotals(selectedDayItems);
    const rolloverKcal = computeRolloverKcal(
      profile.targetCalories,
      profile.calorieRollover,
      yesterdayItems
    );

    const availableCalories = profile.targetCalories + rolloverKcal;
    const caloriesRemaining = Math.max(0, availableCalories - consumedTotals.calories);
    const mealBuckets = groupMealItemsIntoBuckets(selectedDayItems);

    return {
      ok: true,
      data: {
        profile,
        selectedDate,
        mealBuckets,
        allMealItems: selectedDayItems,
        consumedTotals,
        waterMl,
        rolloverKcal,
        availableCalories,
        caloriesRemaining,
        latestWeightKg,
        latestWeightDate,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load dashboard data.",
      code: "QUERY_ERROR",
    };
  }
}
