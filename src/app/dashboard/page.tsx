import { redirect } from "next/navigation";
import { createSupabaseServerClientIfConfigured } from "@/lib/supabase/server";
import {
  DashboardView,
  type DashboardNutritionProfile,
  type LoggedMealItem,
  type MealType,
  type WeightLog
} from "@/features/dashboard/dashboard-view";
import { calculateNutritionTotals, type NutrientFact } from "@/features/nutrition/domain";
import { STANDARD_NUTRIENT_METADATA } from "@/services/food-data/food-detail";

export const dynamic = "force-dynamic";

function mapDbMealType(m: string): MealType {
  const lower = m.toLowerCase().trim();
  if (lower === "breakfast") return "Breakfast";
  if (lower === "lunch") return "Lunch";
  if (lower === "dinner") return "Dinner";
  return "Snacks";
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClientIfConfigured();
  if (!supabase) {
    return (
      <main className="workspace-shell">
        <section className="workspace-card">
          <span className="workspace-status">Setup required</span>
          <h1>Secure sign-in is not configured yet.</h1>
          <p>Add the Supabase project URL and anon key to the server environment, then restart the application. FITAI will not create a local or simulated session.</p>
          <a className="btn btn-light btn-small" href="/">Back to sign in</a>
        </section>
      </main>
    );
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/");

  let profile: { age_band: string | null; display_name: string | null; sex_for_reference: string | null } | null = null;
  let activeGoal: { goal: string } | null = null;
  let nutritionProfile: {
    target_calories: number;
    target_protein_grams: number;
    target_carbs_grams: number;
    target_fat_grams: number;
    target_fiber_grams: number;
    target_water_ml: number;
    weight_kg: number;
    target_weight_kg: number | null;
    goal: string;
    calorie_rollover?: boolean;
  } | null = null;
  let hydrationLogsData: Array<{ local_date: string; volume_ml: number }> = [];
  let weightEntriesData: Array<{ weight_kg: number; recorded_at: string }> = [];
  let mealsData: Array<{
    id: string;
    logged_for: string;
    meal_type: string;
    meal_items: Array<{
      id: string;
      item_name_snapshot: string;
      quantity_grams: number;
      food_id: string | null;
      foods?: {
        food_nutrients?: Array<{
          nutrient_id: string;
          amount_per_100g: number;
          unit: string;
        }>;
      } | null;
    }>;
  }> = [];

  try {
    const [profileRes, goalRes, nutritionRes, hydrationRes, weightRes, mealsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("age_band, display_name, sex_for_reference")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("user_goals")
        .select("goal")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle(),
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
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("hydration_logs")
        .select("local_date, volume_ml")
        .eq("user_id", user.id),
      supabase
        .from("weight_entries")
        .select("weight_kg, recorded_at")
        .eq("user_id", user.id)
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
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
    ]);
    profile = profileRes.data;
    activeGoal = goalRes.data;
    nutritionProfile = nutritionRes.data;
    hydrationLogsData = hydrationRes.data ?? [];
    weightEntriesData = weightRes.data ?? [];
    mealsData = (mealsRes.data as unknown as typeof mealsData) ?? [];
  } catch {
    // Database fallback if schema is not yet applied
  }

  // If user has not completed onboarding or has no nutrition profile, redirect to /onboarding
  if (!nutritionProfile) {
    redirect("/onboarding");
  }

  const displayName = profile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "there";
  const goal = activeGoal?.goal || nutritionProfile.goal || "maintain";

  const mappedNutritionProfile: DashboardNutritionProfile = {
    targetCalories: Number(nutritionProfile.target_calories),
    targetProteinGrams: Number(nutritionProfile.target_protein_grams),
    targetCarbsGrams: Number(nutritionProfile.target_carbs_grams),
    targetFatGrams: Number(nutritionProfile.target_fat_grams),
    targetFiberGrams: Number(nutritionProfile.target_fiber_grams),
    targetWaterMl: Number(nutritionProfile.target_water_ml),
    weightKg: Number(nutritionProfile.weight_kg),
    targetWeightKg: nutritionProfile.target_weight_kg !== null ? Number(nutritionProfile.target_weight_kg) : null,
    calorieRollover: Boolean(nutritionProfile.calorie_rollover)
  };

  // Map hydration logs to Record<string, number> (in Liters)
  const initialWaterLogs: Record<string, number> = {};
  for (const log of hydrationLogsData) {
    if (log.local_date && typeof log.volume_ml === "number") {
      initialWaterLogs[log.local_date] = Math.round((log.volume_ml / 1000) * 100) / 100;
    }
  }

  // Map weight entries to WeightLog[]
  const initialWeightLogs: WeightLog[] = weightEntriesData.map((w) => ({
    date: w.recorded_at.slice(0, 10),
    kg: Number(w.weight_kg)
  }));

  // Reconstruct initial daily meal logs from persisted meals & food nutrients
  const initialDailyLogs: Record<string, LoggedMealItem[]> = {};

  for (const meal of mealsData) {
    const date = meal.logged_for;
    const mType = mapDbMealType(meal.meal_type);
    if (!initialDailyLogs[date]) initialDailyLogs[date] = [];

    const items = Array.isArray(meal.meal_items) ? meal.meal_items : [];
    for (const item of items) {
      const quantityGrams = Number(item.quantity_grams);
      const rawNutrients = item.foods?.food_nutrients || [];

      const facts: NutrientFact[] = rawNutrients.map((fn) => ({
        nutrientId: fn.nutrient_id,
        name: STANDARD_NUTRIENT_METADATA[fn.nutrient_id]?.name || fn.nutrient_id,
        unit: fn.unit,
        amountPer100g: Number(fn.amount_per_100g)
      }));

      const totals = calculateNutritionTotals([{
        foodId: item.food_id || item.id,
        weightGrams: quantityGrams,
        nutrients: facts
      }]);

      initialDailyLogs[date].push({
        id: item.id,
        name: item.item_name_snapshot,
        serving: `${Math.round(quantityGrams)}g`,
        weightGrams: quantityGrams,
        calories: Math.round(totals["1008"]?.amount ?? 0),
        protein: Math.round((totals["1003"]?.amount ?? 0) * 10) / 10,
        carbs: Math.round((totals["1005"]?.amount ?? 0) * 10) / 10,
        fat: Math.round((totals["1004"]?.amount ?? 0) * 10) / 10,
        fiber: Math.round((totals["1079"]?.amount ?? 0) * 10) / 10,
        mealType: mType
      });
    }
  }

  return (
    <DashboardView
      displayName={displayName}
      email={user.email || ""}
      goal={goal}
      ageBand={profile?.age_band ?? null}
      sex={profile?.sex_for_reference ?? null}
      nutritionProfile={mappedNutritionProfile}
      initialDailyLogs={initialDailyLogs}
      initialWaterLogs={initialWaterLogs}
      initialWeightLogs={initialWeightLogs}
    />
  );
}
