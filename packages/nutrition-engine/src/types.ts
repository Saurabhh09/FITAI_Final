/**
 * @fitai/nutrition-engine - Type Definitions
 */

export type SexForCalculation = "male" | "female" | "unspecified";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "very";

export type WorkoutFrequency = "0-2" | "3-5" | "6+";

export type GoalType = "lose_weight" | "maintain" | "gain_weight";

export type DietaryStyle =
  | "balanced"
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "mediterranean"
  | "high-protein";

export type WeightUnit = "kg" | "lb";
export type HeightUnit = "cm" | "ft / in";

/**
 * Validated, non-sensitive profile input required by the nutrition calculation engine.
 */
export type UserNutritionProfileInput = Readonly<{
  birthDate: string; // ISO 'YYYY-MM-DD'
  sexForCalculation: SexForCalculation;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  workoutsPerWeek?: WorkoutFrequency;
  goal: GoalType;
  targetWeightKg?: number;
  weeklyPaceKg?: number; // e.g. 0.25, 0.40 kg/week
  dietaryStyle?: DietaryStyle;
  mealsPerDay?: number;
  calorieRollover?: boolean;
}>;

/**
 * Core estimated daily targets snapshot derived from a user's profile.
 * Stored as a cached snapshot in user_nutrition_profiles.
 */
export type EstimatedDailyTargets = Readonly<{
  engineVersion: string;
  calculatedAt: string; // ISO timestamp
  calories: number;     // kcal / day
  proteinGrams: number; // g / day
  carbsGrams: number;   // g / day
  fatGrams: number;     // g / day
  fiberGrams: number;   // g / day
  waterMl: number;      // mL / day baseline
  disclaimer: string;
}>;

/**
 * Extended plan projection used in onboarding presentations, goal milestones, and dashboard stats.
 */
export type CalculatedPlanSnapshot = Readonly<{
  engineVersion: string;
  calculatedAt: string;
  // Metabolic breakdown
  ageYears: number;
  bmrKcal: number;
  tdeeKcal: number;
  dailyCalorieAdjustmentKcal: number;
  // Daily targets
  targets: EstimatedDailyTargets;
  // Weight & timeline projections
  currentWeightKg: number;
  targetWeightKg: number | null;
  weightDiffKg: number | null;
  weeklyPaceKg: number;
  estimatedWeeksToGoal: number | null;
  projectedTargetDate: string | null; // ISO 'YYYY-MM-DD' or null if no target weight
  projectedTargetDateFormatted: string | null; // e.g. 'November 13' or null if no target weight
  // Context & flags
  isMinor: boolean;
  activityLabel: string;
  isWeightLoss: boolean;
  isWeightGain: boolean;
  isMaintain: boolean;
  disclaimer: string;
}>;
