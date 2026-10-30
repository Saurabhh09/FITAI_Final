import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CORE_NUTRIENT_IDS,
  calculateDailyNutritionTotals,
  calculateUserStreak,
  computeRolloverKcal,
  getDatesInStrip,
  getDayRingStatus,
  getYesterdayISO,
  groupMealItemsIntoBuckets,
  mapDbMealType,
  todayISO,
  type ConsumedTotals,
  type DashboardNutritionProfile,
  type DayCalorieSummary,
  type LoggedMealBucket,
  type LoggedMealItem,
  type UserStreakData,
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
  streakData: UserStreakData;
  weekDaySummaries: Record<string, DayCalorieSummary>;
};

export type DashboardQueryResult =
  | { ok: true; data: MobileDashboardData }
  | { ok: false; error: string; code?: "NO_PROFILE" | "QUERY_ERROR" | "UNAUTHENTICATED" };

export function parseMealItemNutrients(item: RawMealQueryItem, mealType: string): LoggedMealItem {
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

  const today = todayISO();
  const yesterdayDate = getYesterdayISO(selectedDate);
  // Show 7 days anchored on today: 5 past days, today, tomorrow (+1)
  const stripDates = getDatesInStrip(today, 5, 1);
  const queryDates = Array.from(new Set([...stripDates, yesterdayDate, selectedDate]));

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
          height_cm,
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
        .in("logged_for", queryDates)
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
      heightCm: np.height_cm !== null ? Number(np.height_cm) : null,
      displayName: userProfileRes.data?.display_name || "Friend",
    };

    const waterMl = Number(hydrationRes.data?.volume_ml) || 0;
    const latestWeightKg = (weightRes && "data" in weightRes && weightRes.data?.weight_kg != null)
      ? Number(weightRes.data.weight_kg)
      : null;
    const latestWeightDate = (weightRes && "data" in weightRes && weightRes.data?.recorded_at) || null;

    // Separate meals for selectedDate, yesterdayDate, and calculate weekDaySummaries
    const rawMeals = (mealsRes.data as unknown as RawMealQueryRow[]) || [];
    const selectedDayItems: LoggedMealItem[] = [];
    const yesterdayItems: Array<{ calories: number }> = [];
    const dayCaloriesMap: Record<string, number> = {};
    const dayMealCountMap: Record<string, number> = {};

    for (const d of queryDates) {
      dayCaloriesMap[d] = 0;
      dayMealCountMap[d] = 0;
    }

    for (const mealRow of rawMeals) {
      const items = Array.isArray(mealRow.meal_items) ? mealRow.meal_items : [];
      const d = mealRow.logged_for;

      if (items.length > 0) {
        dayMealCountMap[d] = (dayMealCountMap[d] || 0) + items.length;
      }

      for (const item of items) {
        const parsed = parseMealItemNutrients(item, mealRow.meal_type);
        dayCaloriesMap[d] = (dayCaloriesMap[d] || 0) + parsed.calories;

        if (d === selectedDate) {
          selectedDayItems.push(parsed);
        }
        if (d === yesterdayDate) {
          yesterdayItems.push({ calories: parsed.calories });
        }
      }
    }

    const weekDaySummaries: Record<string, DayCalorieSummary> = {};
    for (const d of stripDates) {
      const isFuture = d > today;
      const cals = dayCaloriesMap[d] || 0;
      const hasMeals = (dayMealCountMap[d] || 0) > 0;
      const status = getDayRingStatus(cals, profile.targetCalories, hasMeals, isFuture);
      weekDaySummaries[d] = {
        date: d,
        calories: cals,
        targetCalories: profile.targetCalories,
        hasMeals,
        status,
      };
    }

    // Retrieve user's overall streak dates and total meal count
    let userLoggedDates: string[] = [];
    let totalMealsCount = 0;

    try {
      const [datesRes, countRes] = await Promise.all([
        supabase.from("meals").select("logged_for").eq("user_id", userId),
        supabase.from("meal_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      if (datesRes?.data && Array.isArray(datesRes.data)) {
        userLoggedDates = datesRes.data.map((r: any) => r.logged_for);
      }
      if (countRes && typeof countRes.count === "number") {
        totalMealsCount = countRes.count;
      }
    } catch {
      // Graceful fallback for test mocks or restricted environments
    }

    if (userLoggedDates.length === 0) {
      userLoggedDates = rawMeals.map((m) => m.logged_for);
    }
    if (totalMealsCount === 0) {
      totalMealsCount = selectedDayItems.length;
    }

    const uniqueLoggedDates = Array.from(new Set(userLoggedDates.filter(Boolean)));
    const { currentStreak, longestStreak } = calculateUserStreak(uniqueLoggedDates, today);
    const streakData: UserStreakData = {
      currentStreak,
      longestStreak,
      totalMealsLogged: totalMealsCount,
      totalDaysLogged: uniqueLoggedDates.length,
      loggedDates: uniqueLoggedDates,
    };

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
        streakData,
        weekDaySummaries,
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
