/**
 * @fitai/nutrition-engine - Hydration Estimation
 *
 * Provides a starting daily water target estimate.
 * Explicitly framed as an estimate, NOT a rigid medical prescription.
 */

import { HYDRATION_PARAMETERS } from "./constants";
import type { WorkoutFrequency } from "./types";

export type HydrationEstimateResult = Readonly<{
  targetWaterMl: number;
  targetWaterLiters: number;
  disclaimer: string;
}>;

export function calculateEstimatedHydration(
  weightKg: number,
  workoutsPerWeek?: WorkoutFrequency
): HydrationEstimateResult {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    return {
      targetWaterMl: HYDRATION_PARAMETERS.MIN_DAILY_WATER_ML,
      targetWaterLiters: HYDRATION_PARAMETERS.MIN_DAILY_WATER_ML / 1000,
      disclaimer: "Hydration estimate based on default reference guidelines."
    };
  }

  const baseline = weightKg * HYDRATION_PARAMETERS.ML_PER_KG_BASELINE;
  const workoutAdd = workoutsPerWeek && workoutsPerWeek !== "0-2" ? HYDRATION_PARAMETERS.WORKOUT_ADDITIONAL_ML : 0;
  const total = Math.min(
    HYDRATION_PARAMETERS.MAX_DEFAULT_WATER_ML,
    Math.max(HYDRATION_PARAMETERS.MIN_DAILY_WATER_ML, baseline + workoutAdd)
  );

  // Round to nearest 50 mL for neat daily habit tracking
  const roundedMl = Math.round(total / 50) * 50;

  return {
    targetWaterMl: roundedMl,
    targetWaterLiters: Math.round((roundedMl / 1000) * 10) / 10,
    disclaimer:
      "Hydration needs vary significantly based on climate, heat, sweat rate, physical activity, illness, pregnancy, and sodium intake. Use this as a general daily guide, not a medical prescription."
  };
}
