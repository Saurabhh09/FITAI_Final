import type { SupabaseClient } from "@supabase/supabase-js";
import { todayISO, calculateUserStreak } from "../dashboard/dashboard-domain";
import { parseMealItemNutrients, type RawMealQueryRow } from "../dashboard/dashboard-service";
import { computeMilestoneBadges } from "../milestones/milestones-domain";
import {
  calculateBMI,
  calculateWeightGoalProgress,
  calculateExpenditureChanges,
  type BMIData,
  type ExpenditureRow,
  type WeightEntryItem,
} from "./progress-domain";

export type ProgressScreenData = {
  // Streak & Badges
  currentStreak: number;
  longestStreak: number;
  unlockedBadgesCount: number;
  totalBadgesCount: number;
  // Weight & Goal
  currentWeight: number;
  baselineWeight: number;
  targetWeight: number | null;
  heightCm: number;
  weightGoalProgressPercent: number;
  weightChangeKg: number;
  weightEntries: WeightEntryItem[];
  // BMI
  bmiData: BMIData;
  // Nutrition & Energy
  targetCalories: number;
  dailyNutritionMap: Record<string, { calories: number; protein: number; carbs: number; fat: number }>;
  expenditureChanges: ExpenditureRow[];
  currentWeekLoggedDays: Record<string, boolean>; // dateISO -> hasMeals
};

export type ProgressQueryResult =
  | { ok: true; data: ProgressScreenData }
  | { ok: false; error: string; code: string };

export async function fetchProgressData(
  supabase: SupabaseClient,
  userId: string,
  today: string = todayISO()
): Promise<ProgressQueryResult> {
  if (!userId) {
    return { ok: false, error: "User session required to load progress.", code: "UNAUTHENTICATED" };
  }

  try {
    const [profileRes, weightsRes, mealsRes] = await Promise.all([
      supabase
        .from("user_nutrition_profiles")
        .select(`
          target_calories,
          target_protein_grams,
          target_carbs_grams,
          target_fat_grams,
          height_cm,
          weight_kg,
          target_weight_kg,
          goal
        `)
        .eq("user_id", userId)
        .maybeSingle(),

      supabase
        .from("weight_entries")
        .select("id, weight_kg, recorded_at")
        .eq("user_id", userId)
        .order("recorded_at", { ascending: true }),

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
        .order("logged_for", { ascending: true }),
    ]);

    if (profileRes.error) {
      return { ok: false, error: profileRes.error.message, code: "QUERY_ERROR" };
    }

    const np = profileRes.data;
    const baselineWeight = Number(np?.weight_kg) || 60;
    const targetWeight = np?.target_weight_kg != null ? Number(np.target_weight_kg) : null;
    const heightCm = Number(np?.height_cm) || 174;
    const targetCalories = Number(np?.target_calories) || 2000;

    // Weight entries
    const weightEntries: WeightEntryItem[] = (weightsRes.data || []).map((w: any) => ({
      id: w.id,
      weightKg: Number(w.weight_kg),
      recordedAt: w.recorded_at,
    }));

    // Current weight is latest recorded weight or baseline
    const latestRecordedWeight =
      weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weightKg : baselineWeight;
    const currentWeight = latestRecordedWeight;

    // BMI
    const bmiData = calculateBMI(currentWeight, heightCm);

    // Goal progress
    const { percentOfGoal: weightGoalProgressPercent, changeKg: weightChangeKg } =
      calculateWeightGoalProgress(baselineWeight, currentWeight, targetWeight);

    // Process meals for macros and dates
    const rawMeals = (mealsRes.data as unknown as RawMealQueryRow[]) || [];
    const dailyNutritionMap: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
    const dailyCaloriesOnly: Record<string, number> = {};
    const loggedDatesSet = new Set<string>();
    let totalMealsCount = 0;

    for (const mealRow of rawMeals) {
      const items = Array.isArray(mealRow.meal_items) ? mealRow.meal_items : [];
      const d = mealRow.logged_for;

      if (!dailyNutritionMap[d]) {
        dailyNutritionMap[d] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        dailyCaloriesOnly[d] = 0;
      }

      if (items.length > 0) {
        loggedDatesSet.add(d);
        totalMealsCount += items.length;
      }

      for (const item of items) {
        const parsed = parseMealItemNutrients(item, mealRow.meal_type);
        dailyNutritionMap[d].calories += parsed.calories;
        dailyNutritionMap[d].protein += parsed.protein;
        dailyNutritionMap[d].carbs += parsed.carbs;
        dailyNutritionMap[d].fat += parsed.fat;
        dailyCaloriesOnly[d] += parsed.calories;
      }
    }

    // Streak & Badges
    const loggedDates = Array.from(loggedDatesSet);
    const { currentStreak, longestStreak } = calculateUserStreak(loggedDates, today);
    const milestoneBadges = computeMilestoneBadges({
      currentStreak,
      longestStreak,
      totalMealsLogged: totalMealsCount,
      totalDaysLogged: loggedDates.length,
      waterMl: 0,
      weightKg: currentWeight,
    });

    // Expenditure changes
    const expenditureChanges = calculateExpenditureChanges(dailyCaloriesOnly, targetCalories, today);

    // Map which dates have meals logged for the mini week dots
    const currentWeekLoggedDays: Record<string, boolean> = {};
    for (const d of loggedDates) {
      currentWeekLoggedDays[d] = true;
    }

    return {
      ok: true,
      data: {
        currentStreak,
        longestStreak,
        unlockedBadgesCount: milestoneBadges.unlockedCount,
        totalBadgesCount: milestoneBadges.totalCount,
        currentWeight,
        baselineWeight,
        targetWeight,
        heightCm,
        weightGoalProgressPercent,
        weightChangeKg,
        weightEntries,
        bmiData,
        targetCalories,
        dailyNutritionMap,
        expenditureChanges,
        currentWeekLoggedDays,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load progress data.",
      code: "UNKNOWN",
    };
  }
}
