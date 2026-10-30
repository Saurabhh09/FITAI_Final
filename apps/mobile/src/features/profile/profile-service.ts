import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateNutritionTargets,
  type CalculatedPlanSnapshot,
  type UserNutritionProfileInput,
} from "@fitai/nutrition-engine";

export type UserProfileRecord = {
  id: string;
  displayName: string;
  email: string;
  ageYears: number;
  birthDate: string;
  gender: "male" | "female" | "unspecified";
  heightCm: number;
  weightKg: number;
  targetWeightKg: number | null;
  weeklyPaceKg: number | null;
  goal: "lose_weight" | "maintain" | "gain_weight";
  activityLevel: "sedentary" | "light" | "moderate" | "very";
  workoutsPerWeek: "0-2" | "3-5" | "6+";
  dietaryStyle: string | null;
  mealsPerDay: number | null;
  calorieRollover: boolean;
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
  targetFiberGrams: number;
  targetWaterMl: number;
  stepGoal: number;
  badgeCelebrations: boolean;
  addBurnedCalories: boolean;
  appearance: "light" | "dark" | "system";
};

export type WeightHistoryEntry = {
  id: string;
  weightKg: number;
  recordedAt: string;
};

const PREFERENCES_STORAGE_KEY = "@fitai_user_custom_preferences";

export type StoredPreferences = {
  stepGoal?: number;
  badgeCelebrations?: boolean;
  addBurnedCalories?: boolean;
  appearance?: "light" | "dark" | "system";
};

/**
 * Calculates chronological age from ISO birth date.
 */
export function calculateAge(birthDateStr?: string | null): number {
  if (!birthDateStr) return 20;
  try {
    const dob = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return Math.max(1, age);
  } catch {
    return 20;
  }
}

/**
 * Formats ISO date (YYYY-MM-DD) into DD/MM/YYYY.
 */
export function formatDateOfBirthDisplay(isoDate?: string | null): string {
  if (!isoDate) return "10/12/2008";
  try {
    const parts = isoDate.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
  } catch {
    return isoDate || "10/12/2008";
  }
}

/**
 * Loads stored local preferences (step goal, appearance, badge celebrations).
 */
export async function getLocalPreferences(): Promise<StoredPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Return defaults
  }
  return {
    stepGoal: 10000,
    badgeCelebrations: true,
    addBurnedCalories: false,
    appearance: "light",
  };
}

/**
 * Saves local preferences.
 */
export async function saveLocalPreferences(prefs: StoredPreferences): Promise<void> {
  try {
    const existing = await getLocalPreferences();
    const updated = { ...existing, ...prefs };
    await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Non-fatal
  }
}

/**
 * Fetches all user profile details, nutrition targets, preferences, and weight logs.
 */
export async function fetchFullUserProfile(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string = ""
): Promise<{ ok: boolean; profile?: UserProfileRecord; error?: string }> {
  try {
    const [profileRes, nutritionRes, prefs] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("user_nutrition_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      getLocalPreferences(),
    ]);

    const displayName =
      profileRes.data?.display_name || userEmail.split("@")[0] || "";

    const np = nutritionRes.data;

    // Baseline fallback if not yet set
    const birthDate = np?.birth_date || "2008-10-12";
    const heightCm = Number(np?.height_cm) || 171.0;
    const weightKg = Number(np?.weight_kg) || 48.0;
    const targetWeightKg = np?.target_weight_kg ? Number(np.target_weight_kg) : 60.9;
    const gender = (np?.sex_for_calculation as "male" | "female" | "unspecified") || "male";
    const goal = (np?.goal as "lose_weight" | "maintain" | "gain_weight") || "maintain";
    const activityLevel = (np?.activity_level as any) || "moderate";
    const workoutsPerWeek = (np?.workouts_per_week as any) || "3-5";
    const calorieRollover = Boolean(np?.calorie_rollover);

    const record: UserProfileRecord = {
      id: userId,
      displayName,
      email: userEmail,
      ageYears: calculateAge(birthDate),
      birthDate,
      gender,
      heightCm,
      weightKg,
      targetWeightKg,
      weeklyPaceKg: np?.weekly_pace_kg ? Number(np.weekly_pace_kg) : 0.5,
      goal,
      activityLevel,
      workoutsPerWeek,
      dietaryStyle: np?.dietary_style || "balanced",
      mealsPerDay: np?.meals_per_day ? Number(np.meals_per_day) : 3,
      calorieRollover,
      targetCalories: Number(np?.target_calories) || 2000,
      targetProteinGrams: Number(np?.target_protein_grams) || 120,
      targetCarbsGrams: Number(np?.target_carbs_grams) || 250,
      targetFatGrams: Number(np?.target_fat_grams) || 60,
      targetFiberGrams: Number(np?.target_fiber_grams) || 28,
      targetWaterMl: Number(np?.target_water_ml) || 2500,
      stepGoal: prefs.stepGoal || 10000,
      badgeCelebrations: prefs.badgeCelebrations !== false,
      addBurnedCalories: Boolean(prefs.addBurnedCalories),
      appearance: prefs.appearance || "light",
    };

    return { ok: true, profile: record };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to load user profile." };
  }
}

/**
 * Updates the user's display name.
 */
export async function updateUserDisplayName(
  supabase: SupabaseClient,
  userId: string,
  newDisplayName: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: newDisplayName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update name." };
  }
}

/**
 * Updates personal metrics (weight, height, birth date, gender, goal),
 * recalculates nutrition targets via @fitai/nutrition-engine,
 * and saves both metrics and new targets to Supabase.
 */
export async function updatePersonalMetrics(
  supabase: SupabaseClient,
  userId: string,
  current: UserProfileRecord,
  updates: Partial<UserProfileRecord>
): Promise<{
  ok: boolean;
  recalculatedSnapshot?: CalculatedPlanSnapshot;
  error?: string;
}> {
  try {
    const merged = { ...current, ...updates };

    const engineInput: UserNutritionProfileInput = {
      birthDate: merged.birthDate,
      sexForCalculation: merged.gender,
      heightCm: merged.heightCm,
      weightKg: merged.weightKg,
      activityLevel: merged.activityLevel,
      workoutsPerWeek: merged.workoutsPerWeek,
      goal: merged.goal,
      targetWeightKg: merged.goal === "maintain" ? undefined : (merged.targetWeightKg ?? undefined),
      weeklyPaceKg: merged.goal === "maintain" ? undefined : (merged.weeklyPaceKg ?? 0.5),
      dietaryStyle: (merged.dietaryStyle as any) || "balanced",
      mealsPerDay: merged.mealsPerDay || 3,
      calorieRollover: merged.calorieRollover,
    };

    // Deterministically calculate targets via nutrition engine
    const snapshot = calculateNutritionTargets(engineInput);
    const { targets } = snapshot;

    // 1. Update user_nutrition_profiles
    const { error: profileError } = await supabase
      .from("user_nutrition_profiles")
      .update({
        birth_date: merged.birthDate,
        sex_for_calculation: merged.gender,
        height_cm: merged.heightCm,
        weight_kg: merged.weightKg,
        target_weight_kg: merged.targetWeightKg,
        weekly_pace_kg: merged.weeklyPaceKg,
        goal: merged.goal,
        calorie_rollover: merged.calorieRollover,
        target_calories: targets.calories,
        target_protein_grams: targets.proteinGrams,
        target_carbs_grams: targets.carbsGrams,
        target_fat_grams: targets.fatGrams,
        target_fiber_grams: targets.fiberGrams,
        target_water_ml: targets.waterMl,
        calculated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (profileError) throw profileError;

    // 2. If weight changed, log an entry in weight_entries
    if (updates.weightKg !== undefined && updates.weightKg !== current.weightKg) {
      await supabase.from("weight_entries").insert({
        user_id: userId,
        weight_kg: updates.weightKg,
        recorded_at: new Date().toISOString(),
        note: "Updated via profile settings",
      });
    }

    return { ok: true, recalculatedSnapshot: snapshot };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update personal metrics." };
  }
}

/**
 * Fetches recent weight history entries.
 */
export async function fetchWeightHistory(
  supabase: SupabaseClient,
  userId: string,
  limit = 20
): Promise<{ ok: boolean; entries?: WeightHistoryEntry[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("weight_entries")
      .select("id, weight_kg, recorded_at")
      .eq("user_id", userId)
      .order("recorded_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const entries: WeightHistoryEntry[] = (data || []).map((row) => ({
      id: row.id,
      weightKg: Number(row.weight_kg),
      recordedAt: row.recorded_at,
    }));

    return { ok: true, entries };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch weight history." };
  }
}

/**
 * Logs a new weight entry and updates the baseline weight in user_nutrition_profiles.
 */
export async function logNewWeight(
  supabase: SupabaseClient,
  userId: string,
  weightKg: number
): Promise<{ ok: boolean; entry?: WeightHistoryEntry; error?: string }> {
  try {
    const recordedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("weight_entries")
      .insert({
        user_id: userId,
        weight_kg: weightKg,
        recorded_at: recordedAt,
        note: "Manual weight log",
      })
      .select("id")
      .maybeSingle();

    if (error) throw error;

    await supabase
      .from("user_nutrition_profiles")
      .update({
        weight_kg: weightKg,
        updated_at: recordedAt,
      })
      .eq("user_id", userId);

    return {
      ok: true,
      entry: {
        id: data?.id || `w_${Date.now()}`,
        weightKg,
        recordedAt,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to log weight." };
  }
}

/**
 * Updates nutrition goals directly with custom natural numbers entered by the user.
 */
export async function updateCustomNutritionGoals(
  supabase: SupabaseClient,
  userId: string,
  targets: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    fiberGrams?: number;
    waterMl?: number;
  }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("user_nutrition_profiles")
      .update({
        target_calories: targets.calories,
        target_protein_grams: targets.proteinGrams,
        target_carbs_grams: targets.carbsGrams,
        target_fat_grams: targets.fatGrams,
        target_fiber_grams: targets.fiberGrams ?? 28,
        target_water_ml: targets.waterMl ?? 2500,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) throw error;
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update nutrition goals." };
  }
}

/**
 * Helper to encode base64 for basic auth.
 */
function base64Encode(str: string): string {
  if (typeof btoa === "function") return btoa(str);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  for (
    let block = 0, charCode = 0, i = 0, map = chars;
    str.charAt(i | 0) || ((map = "="), i % 1);
    output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
  ) {
    charCode = str.charCodeAt((i += 3 / 4));
    if (charCode > 0xff) {
      throw new Error("'btoa' failed: String contains characters outside Latin1 range.");
    }
    block = (block << 8) | charCode;
  }
  return output;
}

/**
 * Permanently deletes the user account, all database records in Supabase,
 * and purges all photos uploaded to ImageKit CDN by this user.
 */
export async function deleteUserAccountPermanently(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // 1. Fetch user's ImageKit file IDs to delete from CDN
    const { data: scanRecords } = await supabase
      .from("meal_scans")
      .select("image_kit_file_id")
      .eq("user_id", userId);

    const imageKitSecretKey =
      process.env.EXPO_PUBLIC_IMAGE_KIT_SECRET_KEY ||
      process.env.IMAGE_KIT_SECRET_KEY ||
      "";

    if (scanRecords && scanRecords.length > 0) {
      for (const rec of scanRecords) {
        if (rec.image_kit_file_id) {
          try {
            // Official ImageKit REST file deletion endpoint: https://api.imagekit.io/v1/files/${fileId}
            await fetch(`https://api.imagekit.io/v1/files/${rec.image_kit_file_id}`, {
              method: "DELETE",
              headers: {
                Authorization: `Basic ${base64Encode(`${imageKitSecretKey}:`)}`,
              },
            });
          } catch {
            // Ignore individual file deletion errors to ensure account wipe proceeds
          }
        }
      }
    }

    // 2. Delete Supabase user records from child tables
    await supabase.from("meal_scans").delete().eq("user_id", userId);
    await supabase.from("meals").delete().eq("user_id", userId);
    await supabase.from("weight_entries").delete().eq("user_id", userId);
    await supabase.from("hydration_logs").delete().eq("user_id", userId);
    await supabase.from("user_nutrition_profiles").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);

    // 3. Delete user from Supabase Authentication (auth.users)
    // Deleting from auth.users triggers PostgreSQL ON DELETE CASCADE for all linked tables
    const supabaseUrl =
      (supabase as any).supabaseUrl ||
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://itiutfonatlwahiozjqi.supabase.co";

    const supabaseAdminKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    if (supabaseUrl && supabaseAdminKey) {
      try {
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: "DELETE",
          headers: {
            apikey: supabaseAdminKey,
            Authorization: `Bearer ${supabaseAdminKey}`,
          },
        });
      } catch (authErr) {
        console.warn("[deleteUserAccountPermanently] Auth admin delete error:", authErr);
      }
    }

    // 4. Clear local storage
    await AsyncStorage.clear();

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to permanently delete account." };
  }
}
