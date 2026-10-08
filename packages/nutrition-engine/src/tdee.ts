/**
 * @fitai/nutrition-engine - Total Daily Energy Expenditure (TDEE) Calculation
 */

import { ACTIVITY_MULTIPLIERS, WORKOUT_BONUS_MULTIPLIERS } from "./constants";
import type { ActivityLevel, WorkoutFrequency } from "./types";

export type TdeeCalculationResult = Readonly<{
  tdeeKcal: number;
  baseActivityMultiplier: number;
  workoutBonusMultiplier: number;
  totalMultiplier: number;
  activityLabel: string;
}>;

export const ACTIVITY_DISPLAY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary",
  light: "Lightly active",
  moderate: "Moderately active",
  very: "Very active"
};

/**
 * Calculates estimated TDEE from BMR and daily activity level.
 * Formula: TDEE = BMR * activity_factor
 * Workouts per week is retained in profile context but does not independently add to TDEE to avoid double-counting.
 */
export function calculateTdee(
  bmrKcal: number,
  activityLevel: ActivityLevel,
  workoutsPerWeek?: WorkoutFrequency
): TdeeCalculationResult {
  if (!Number.isFinite(bmrKcal) || bmrKcal <= 0) {
    throw new RangeError(`bmrKcal must be a positive finite number, received: ${bmrKcal}`);
  }

  const baseMultiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? ACTIVITY_MULTIPLIERS.moderate;
  const workoutBonus = 0; // Workout frequency does not independently add to TDEE to prevent double-counting PAL
  const totalMultiplier = baseMultiplier;

  const tdee = Math.round(bmrKcal * totalMultiplier);

  return {
    tdeeKcal: tdee,
    baseActivityMultiplier: baseMultiplier,
    workoutBonusMultiplier: workoutBonus,
    totalMultiplier,
    activityLabel: ACTIVITY_DISPLAY_LABELS[activityLevel] ?? "Moderately active"
  };
}
