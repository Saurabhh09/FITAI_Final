import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileCheckResult = {
  exists: boolean;
  error?: string;
};

/**
 * Checks if the authenticated user has an existing record in public.user_nutrition_profiles.
 * Relies on authenticated Supabase RLS (user_nutrition_profiles_owner_all).
 */
export async function checkUserNutritionProfileExists(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileCheckResult> {
  if (!userId) {
    return { exists: false, error: "A valid user ID is required." };
  }

  try {
    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "Profile check timeout" } }), 5000)
    );
    const queryPromise = supabase
      .from("user_nutrition_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (error) {
      return { exists: false, error: error.message };
    }

    return { exists: Boolean(data?.user_id) };
  } catch (err) {
    return {
      exists: false,
      error: err instanceof Error ? err.message : "Failed to verify nutrition profile."
    };
  }
}
