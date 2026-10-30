import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "../../lib/supabase";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export type WaterLogResponse = {
  ok: boolean;
  date: string;
  volumeMl: number;
};

export type WeightEntryResponse = {
  ok: boolean;
  entry: {
    id: string;
    weight_kg: number;
    recorded_at: string;
  };
};

/**
 * Logs or updates hydration volume for a specific date directly in Supabase.
 * Operates independently on mobile via RLS without requiring a desktop web server.
 */
export async function logWaterApi(
  date: string,
  volumeMl: number,
  _accessToken?: string,
  supabaseClient?: SupabaseClient
): Promise<ApiResult<WaterLogResponse>> {
  if (volumeMl < 0 || volumeMl > 20000) {
    return { ok: false, error: "Volume must be between 0 and 20000 ml." };
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return { ok: false, error: "Date must be YYYY-MM-DD." };
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

    const { error: dbError } = await supabase.from("hydration_logs").upsert(
      {
        user_id: user.id,
        local_date: date,
        volume_ml: volumeMl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,local_date" }
    );

    if (dbError) {
      return {
        ok: false,
        error: dbError.message || "Could not save hydration log.",
      };
    }

    return {
      ok: true,
      data: {
        ok: true,
        date,
        volumeMl,
      },
    };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to connect to hydration service.";
    return { ok: false, error: msg };
  }
}

/**
 * Logs a new weight entry directly in Supabase.
 * Operates independently on mobile via RLS without requiring a desktop web server.
 */
export async function logWeightApi(
  weightKg: number,
  recordedAt: string | undefined,
  _accessToken?: string,
  note?: string,
  supabaseClient?: SupabaseClient
): Promise<ApiResult<WeightEntryResponse>> {
  if (typeof weightKg !== "number" || isNaN(weightKg) || weightKg < 20 || weightKg > 500) {
    return { ok: false, error: "Weight must be between 20 and 500 kg." };
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

    const { data, error: dbError } = await supabase
      .from("weight_entries")
      .insert({
        user_id: user.id,
        weight_kg: weightKg,
        recorded_at: recordedAt || new Date().toISOString(),
        note: note ? note.trim() : null,
      })
      .select("id, weight_kg, recorded_at")
      .single();

    if (dbError || !data) {
      return {
        ok: false,
        error: dbError?.message || "Could not save weight entry.",
      };
    }

    return {
      ok: true,
      data: {
        ok: true,
        entry: {
          id: data.id,
          weight_kg: Number(data.weight_kg),
          recorded_at: data.recorded_at,
        },
      },
    };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to connect to weight service.";
    return { ok: false, error: msg };
  }
}
