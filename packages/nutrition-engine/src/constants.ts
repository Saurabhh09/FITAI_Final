/**
 * @fitai/nutrition-engine - Constants & Estimation Parameters
 *
 * Versioning: ENGINE_VERSION
 * All constants in this file represent documented estimation parameters,
 * NOT absolute or medical physiological requirements.
 */

export const ENGINE_VERSION = "1.0.0" as const;

/**
 * Standard Atwater energy density equivalents (kcal per gram of macronutrient).
 */
export const ATWATER_FACTORS = {
  PROTEIN_KCAL_PER_G: 4,
  CARBS_KCAL_PER_G: 4,
  FAT_KCAL_PER_G: 9,
  ALCOHOL_KCAL_PER_G: 7
} as const;

/**
 * Approximate metabolic energy stored per kilogram of body weight tissue (adipose / lean mix).
 * Used as an engineering heuristic / energy-equivalent estimate (~7,700 kcal/kg),
 * NOT an exact biological constant.
 */
export const KCAL_PER_KG_WEIGHT_CHANGE = 7700;

/**
 * Mifflin-St Jeor (1990) Resting Metabolic Rate (RMR / BMR) estimation constants:
 * BMR = (10 * weight_kg) + (6.25 * height_cm) - (5 * age_years) + s
 */
export const MIFFLIN_ST_JEOR_CONSTANTS = {
  WEIGHT_MULTIPLIER: 10,
  HEIGHT_MULTIPLIER: 6.25,
  AGE_MULTIPLIER: 5,
  SEX_OFFSET_MALE: 5,
  SEX_OFFSET_FEMALE: -161,
  // Midpoint offset when biological sex is unspecified or non-binary
  SEX_OFFSET_UNSPECIFIED: -78
} as const;

/**
 * Physical Activity Level (PAL) multipliers based on standard FAO/WHO/UNU guidelines.
 * Sedentary (mostly sitting): 1.20
 * Lightly active: 1.375
 * Moderately active: 1.55
 * Very active: 1.725
 */
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,     // Mostly sitting / desk work
  light: 1.375,       // Light exercise or sports 1-3 days/week
  moderate: 1.55,     // Moderate exercise or sports 3-5 days/week
  very: 1.725         // Very active / physical work or hard training
} as const;

/**
 * Workout frequency constants retained for onboarding profile information and hydration estimation.
 * NOTE: Workout frequency is NOT added as an independent TDEE multiplier in the current engine
 * to avoid double-counting physical activity already represented in PAL.
 */
export const WORKOUT_BONUS_MULTIPLIERS = {
  "0-2": 0.0,
  "3-5": 0.0,
  "6+": 0.0
} as const;

/**
 * Product planning / engineering bounds for daily energy deficit and surplus adjustments.
 * Note: These are software planning bounds, not universal clinical requirements.
 */
export const ENERGY_ADJUSTMENT_BOUNDS = {
  // Weight loss deficit bounds (engineering bounds: 250 - 600 kcal/day)
  MIN_DEFICIT_KCAL: 250,
  MAX_DEFICIT_KCAL: 600,
  // Weight gain surplus bounds (engineering bounds: 200 - 450 kcal/day)
  MIN_SURPLUS_KCAL: 200,
  MAX_SURPLUS_KCAL: 450,
  // Daily caloric intake engineering floors to prevent unsafe restriction
  MIN_CALORIC_FLOOR_FEMALE: 1200,
  MIN_CALORIC_FLOOR_MALE: 1500,
  MIN_CALORIC_FLOOR_UNSPECIFIED: 1350
} as const;

/**
 * Protein estimation baselines (grams per kilogram of body weight).
 * These serve as product planning heuristics, NOT universal physiological requirements.
 */
export const PROTEIN_PARAMETERS = {
  MAINTAIN_MIN_G_PER_KG: 1.2,
  MAINTAIN_TARGET_G_PER_KG: 1.4,
  LOSS_DEFICIT_MIN_G_PER_KG: 1.6,
  LOSS_DEFICIT_TARGET_G_PER_KG: 2.0,
  GAIN_SURPLUS_TARGET_G_PER_KG: 1.8,
  // High-protein eating style override
  HIGH_PROTEIN_OVERRIDE_G_PER_KG: 2.2,
  // Practical upper ceiling for macro reconciliation
  MAX_PROTEIN_G_PER_KG: 2.6,
  ABSOLUTE_MAX_PROTEIN_G: 280,
  ABSOLUTE_MIN_PROTEIN_G: 45
} as const;

/**
 * Dietary fat bounds and targets.
 * Standard product planning baseline: 25% of target calories, with a 35g engineering floor.
 * Not universal clinical mandates.
 */
export const FAT_PARAMETERS = {
  TARGET_CALORIC_RATIO: 0.25,
  MIN_CALORIC_RATIO: 0.20,
  MAX_CALORIC_RATIO: 0.35,
  ABSOLUTE_MIN_FAT_G: 35
} as const;

/**
 * Dietary fiber recommendation based on USDA / Academy of Nutrition and Dietetics guidelines:
 * 14 grams per 1,000 kcal consumed, bounded within 20-50g product planning range.
 * Not universal physiological minimum/maximum values.
 */
export const FIBER_PARAMETERS = {
  GRAMS_PER_1000_KCAL: 14,
  MIN_FIBER_G: 20,
  MAX_RECOMMENDED_FIBER_G: 50
} as const;

/**
 * Daily hydration planning parameters (mL per kg of body weight).
 * Frame as an estimation guide, NOT a rigid medical prescription.
 */
export const HYDRATION_PARAMETERS = {
  ML_PER_KG_BASELINE: 35,
  WORKOUT_ADDITIONAL_ML: 400,
  MIN_DAILY_WATER_ML: 1800,
  MAX_DEFAULT_WATER_ML: 4500
} as const;

/**
 * Standard user-facing disclaimer required on all estimation outputs.
 */
export const NUTRITION_DISCLAIMER =
  "Daily energy, macro, and hydration figures are calculated estimates to guide daily habits. Individual metabolic responses vary based on health, body composition, climate, and activity. These estimates are not medical prescriptions." as const;

/**
 * Minor-specific safety disclaimer applied to all calculations for users under 18.
 * Clarifies that caloric deficits and weight-loss plans are strictly unavailable for minors.
 */
export const MINOR_SAFETY_DISCLAIMER =
  "For individuals under 18, FitAI provides non-restrictive general nutritional baseline estimates only. Caloric restriction and weight-loss deficit planning are strictly disabled for minors. Consult a qualified pediatrician or registered dietitian for specialized guidance." as const;
