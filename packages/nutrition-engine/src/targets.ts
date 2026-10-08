/**
 * @fitai/nutrition-engine - Targets & Plan Snapshot Calculation
 */

import { calculateMifflinStJeorBmr } from "./bmr";
import {
  ATWATER_FACTORS,
  ENERGY_ADJUSTMENT_BOUNDS,
  ENGINE_VERSION,
  FAT_PARAMETERS,
  FIBER_PARAMETERS,
  KCAL_PER_KG_WEIGHT_CHANGE,
  MINOR_SAFETY_DISCLAIMER,
  NUTRITION_DISCLAIMER,
  PROTEIN_PARAMETERS
} from "./constants";
import { calculateEstimatedHydration } from "./hydration";
import { calculateTdee } from "./tdee";
import type {
  CalculatedPlanSnapshot,
  EstimatedDailyTargets,
  UserNutritionProfileInput
} from "./types";

export function calculateNutritionTargets(
  input: UserNutritionProfileInput,
  referenceDate: Date = new Date()
): CalculatedPlanSnapshot {
  const {
    birthDate,
    sexForCalculation,
    heightCm,
    weightKg,
    activityLevel,
    workoutsPerWeek,
    goal,
    targetWeightKg,
    weeklyPaceKg,
    dietaryStyle
  } = input;

  // 1. Calculate BMR
  const bmrResult = calculateMifflinStJeorBmr(
    weightKg,
    heightCm,
    birthDate,
    sexForCalculation,
    referenceDate
  );

  // 2. Calculate TDEE
  const tdeeResult = calculateTdee(bmrResult.bmrKcal, activityLevel, workoutsPerWeek);

  // 3. Goal & Caloric Adjustment
  let isLose = goal === "lose_weight";
  let isGain = goal === "gain_weight";
  let isMaintain = goal === "maintain";

  // Safety override: Minors must not be given a caloric restriction deficit
  if (bmrResult.isMinor && isLose) {
    isLose = false;
    isMaintain = true;
  }

  const defaultPace = isGain ? 0.25 : isLose ? 0.4 : 0.0;
  const pace = Number.isFinite(weeklyPaceKg) && (weeklyPaceKg ?? 0) > 0 ? (weeklyPaceKg as number) : defaultPace;

  let adjustmentKcal = 0;
  let rawCalories = tdeeResult.tdeeKcal;

  if (isLose) {
    const rawDeficit = (pace * KCAL_PER_KG_WEIGHT_CHANGE) / 7;
    const boundedDeficit = Math.min(
      ENERGY_ADJUSTMENT_BOUNDS.MAX_DEFICIT_KCAL,
      Math.max(ENERGY_ADJUSTMENT_BOUNDS.MIN_DEFICIT_KCAL, Math.round(rawDeficit))
    );
    adjustmentKcal = -boundedDeficit;

    const floor =
      sexForCalculation === "male"
        ? ENERGY_ADJUSTMENT_BOUNDS.MIN_CALORIC_FLOOR_MALE
        : sexForCalculation === "female"
        ? ENERGY_ADJUSTMENT_BOUNDS.MIN_CALORIC_FLOOR_FEMALE
        : ENERGY_ADJUSTMENT_BOUNDS.MIN_CALORIC_FLOOR_UNSPECIFIED;

    rawCalories = Math.max(floor, tdeeResult.tdeeKcal - boundedDeficit);
  } else if (isGain) {
    const rawSurplus = (pace * KCAL_PER_KG_WEIGHT_CHANGE) / 7;
    const boundedSurplus = Math.min(
      ENERGY_ADJUSTMENT_BOUNDS.MAX_SURPLUS_KCAL,
      Math.max(ENERGY_ADJUSTMENT_BOUNDS.MIN_SURPLUS_KCAL, Math.round(rawSurplus))
    );
    adjustmentKcal = boundedSurplus;
    rawCalories = tdeeResult.tdeeKcal + boundedSurplus;
  }

  // Round target calories to nearest 10 kcal
  const targetCalories = Math.round(rawCalories / 10) * 10;

  // 4. Macronutrient Targets
  // A. Protein (anchored on body weight, adjusted for deficit/surplus and diet style)
  let proteinGramsPerKg: number = isLose
    ? PROTEIN_PARAMETERS.LOSS_DEFICIT_TARGET_G_PER_KG
    : isGain
    ? PROTEIN_PARAMETERS.GAIN_SURPLUS_TARGET_G_PER_KG
    : PROTEIN_PARAMETERS.MAINTAIN_TARGET_G_PER_KG;

  if (dietaryStyle === "high-protein") {
    proteinGramsPerKg = PROTEIN_PARAMETERS.HIGH_PROTEIN_OVERRIDE_G_PER_KG;
  }

  const effectiveWeight = isGain && targetWeightKg && targetWeightKg > weightKg ? targetWeightKg : weightKg;
  let targetProteinGrams = Math.round(effectiveWeight * proteinGramsPerKg);

  // Protein bounds: Cap at 35% of total calories and absolute safety ceiling
  const maxProteinFromCalories = Math.floor((targetCalories * 0.35) / ATWATER_FACTORS.PROTEIN_KCAL_PER_G);
  targetProteinGrams = Math.min(
    PROTEIN_PARAMETERS.ABSOLUTE_MAX_PROTEIN_G,
    Math.min(targetProteinGrams, maxProteinFromCalories)
  );
  targetProteinGrams = Math.max(PROTEIN_PARAMETERS.ABSOLUTE_MIN_PROTEIN_G, targetProteinGrams);

  // B. Dietary Fat (percentage of total energy with minimum floor)
  const targetFatKcal = targetCalories * FAT_PARAMETERS.TARGET_CALORIC_RATIO;
  let targetFatGrams = Math.round(targetFatKcal / ATWATER_FACTORS.FAT_KCAL_PER_G);
  targetFatGrams = Math.max(FAT_PARAMETERS.ABSOLUTE_MIN_FAT_G, targetFatGrams);

  // C. Carbohydrates (remainder of caloric budget)
  const allocatedKcal =
    targetProteinGrams * ATWATER_FACTORS.PROTEIN_KCAL_PER_G +
    targetFatGrams * ATWATER_FACTORS.FAT_KCAL_PER_G;
  const remainingKcal = Math.max(0, targetCalories - allocatedKcal);
  const targetCarbsGrams = Math.round(remainingKcal / ATWATER_FACTORS.CARBS_KCAL_PER_G);

  // D. Dietary Fiber (14g per 1,000 kcal)
  const rawFiber = (targetCalories / 1000) * FIBER_PARAMETERS.GRAMS_PER_1000_KCAL;
  const targetFiberGrams = Math.min(
    FIBER_PARAMETERS.MAX_RECOMMENDED_FIBER_G,
    Math.max(FIBER_PARAMETERS.MIN_FIBER_G, Math.round(rawFiber))
  );

  // E. Hydration
  const hydration = calculateEstimatedHydration(weightKg, workoutsPerWeek);

  // 5. Timeline Projections (No invented target weights)
  let resolvedTargetWeightKg: number | null = null;
  let resolvedWeightDiffKg: number | null = null;
  let estimatedWeeks: number | null = null;
  let projectedTargetDate: string | null = null;
  let projectedTargetDateFormatted: string | null = null;

  if (isMaintain) {
    resolvedTargetWeightKg = weightKg;
    resolvedWeightDiffKg = 0;
    estimatedWeeks = 0;
    projectedTargetDate = referenceDate.toISOString().slice(0, 10);
    projectedTargetDateFormatted = referenceDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric"
    });
  } else if (typeof targetWeightKg === "number" && Number.isFinite(targetWeightKg) && targetWeightKg > 0) {
    resolvedTargetWeightKg = targetWeightKg;
    const weightDiff = Math.abs(targetWeightKg - weightKg);
    resolvedWeightDiffKg = Math.round(weightDiff * 10) / 10;
    estimatedWeeks = Math.max(1, Math.ceil(weightDiff / Math.max(0.1, pace)));

    const projectedDate = new Date(referenceDate.getTime());
    projectedDate.setDate(projectedDate.getDate() + estimatedWeeks * 7);
    projectedTargetDate = projectedDate.toISOString().slice(0, 10);
    projectedTargetDateFormatted = projectedDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric"
    });
  }

  const nowIso = referenceDate.toISOString();
  const planDisclaimer = bmrResult.isMinor ? MINOR_SAFETY_DISCLAIMER : NUTRITION_DISCLAIMER;

  const targets: EstimatedDailyTargets = {
    engineVersion: ENGINE_VERSION,
    calculatedAt: nowIso,
    calories: targetCalories,
    proteinGrams: targetProteinGrams,
    carbsGrams: targetCarbsGrams,
    fatGrams: targetFatGrams,
    fiberGrams: targetFiberGrams,
    waterMl: hydration.targetWaterMl,
    disclaimer: planDisclaimer
  };

  return {
    engineVersion: ENGINE_VERSION,
    calculatedAt: nowIso,
    ageYears: bmrResult.ageYears,
    bmrKcal: bmrResult.bmrKcal,
    tdeeKcal: tdeeResult.tdeeKcal,
    dailyCalorieAdjustmentKcal: adjustmentKcal,
    targets,
    currentWeightKg: weightKg,
    targetWeightKg: resolvedTargetWeightKg,
    weightDiffKg: resolvedWeightDiffKg,
    weeklyPaceKg: pace,
    estimatedWeeksToGoal: estimatedWeeks,
    projectedTargetDate,
    projectedTargetDateFormatted,
    isMinor: bmrResult.isMinor,
    activityLabel: tdeeResult.activityLabel,
    isWeightLoss: isLose,
    isWeightGain: isGain,
    isMaintain,
    disclaimer: planDisclaimer
  };
}
