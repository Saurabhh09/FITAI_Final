import { calculateNutritionTargets } from "@fitai/nutrition-engine";
import type {
  GoalType,
  SexForCalculation,
  UserNutritionProfileInput
} from "@fitai/nutrition-engine";
import { getAgeYears, type QuestionnaireAnswers } from "./questionnaire";

export type CompleteOnboardingRpcParams = {
  p_age_band: "under_13" | "13_17" | "18_29" | "30_49" | "50_69" | "70_plus" | "prefer_not_to_say";
  p_goal: "lose_weight" | "maintain" | "gain_weight" | "improve_energy" | "habit_consistency" | "sports_performance";
  p_sex_for_reference: "female" | "male" | "unspecified" | null;
  p_country_code: string | null;
  p_display_name: string | null;
  p_birth_date: string;
  p_sex_for_calculation: "male" | "female" | "unspecified";
  p_height_cm: number;
  p_weight_kg: number;
  p_activity_level: "sedentary" | "light" | "moderate" | "very";
  p_workouts_per_week: "0-2" | "3-5" | "6+";
  p_nutrition_goal: "lose_weight" | "maintain" | "gain_weight";
  p_target_weight_kg: number | null;
  p_weekly_pace_kg: number | null;
  p_dietary_style: string | null;
  p_meals_per_day: number | null;
  p_calorie_rollover: boolean;
  p_target_calories: number;
  p_target_protein_grams: number;
  p_target_carbs_grams: number;
  p_target_fat_grams: number;
  p_target_fiber_grams: number;
  p_target_water_ml: number;
  p_calculation_version: string;
  p_calculated_at: string;
};

export function getAgeBandFromBirthDate(birthDate: string): "under_13" | "13_17" | "18_29" | "30_49" | "50_69" | "70_plus" {
  const age = getAgeYears(birthDate);
  if (age === null || age < 13) return "under_13";
  if (age < 18) return "13_17";
  if (age < 30) return "18_29";
  if (age < 50) return "30_49";
  if (age < 70) return "50_69";
  return "70_plus";
}

export function mapQuestionnaireGoal(goal: "lose" | "maintain" | "gain" | undefined): GoalType {
  if (goal === "lose") return "lose_weight";
  if (goal === "gain") return "gain_weight";
  return "maintain";
}

export function mapQuestionnaireSex(sex: "male" | "female" | "other" | undefined): {
  sexForCalculation: SexForCalculation;
  sexForReference: "female" | "male" | "unspecified" | null;
} {
  if (sex === "female") {
    return { sexForCalculation: "female", sexForReference: "female" };
  }
  if (sex === "male") {
    return { sexForCalculation: "male", sexForReference: "male" };
  }
  return { sexForCalculation: "unspecified", sexForReference: "unspecified" };
}

export function buildOnboardingRpcPayload(
  answers: QuestionnaireAnswers,
  options?: {
    displayName?: string | null;
    countryCode?: string | null;
    referenceDate?: Date;
  }
): CompleteOnboardingRpcParams {
  if (!answers.birthDate || getAgeYears(answers.birthDate) === null) {
    throw new Error("A valid birth date is required for nutrition calculation.");
  }
  if (!answers.sex) {
    throw new Error("Sex is required for nutrition calculation.");
  }
  if (typeof answers.heightCm !== "number" || answers.heightCm < 100 || answers.heightCm > 260) {
    throw new Error("Height must be between 100 and 260 cm.");
  }
  if (typeof answers.weightKg !== "number" || answers.weightKg < 30 || answers.weightKg > 350) {
    throw new Error("Weight must be between 30 and 350 kg.");
  }
  if (!answers.activity) {
    throw new Error("Activity level is required for nutrition calculation.");
  }
  if (!answers.goal) {
    throw new Error("Goal is required for nutrition calculation.");
  }

  const ageYears = getAgeYears(answers.birthDate)!;
  const nutritionGoal = mapQuestionnaireGoal(answers.goal);

  // Safety rule: Under-18 cannot select weight loss
  if (ageYears < 18 && nutritionGoal === "lose_weight") {
    throw new Error("Weight-loss plans are not available for minors or unconfirmed age.");
  }

  const { sexForCalculation, sexForReference } = mapQuestionnaireSex(answers.sex);

  const engineInput: UserNutritionProfileInput = {
    birthDate: answers.birthDate,
    sexForCalculation,
    heightCm: answers.heightCm,
    weightKg: answers.weightKg,
    activityLevel: answers.activity,
    workoutsPerWeek: answers.workouts ?? "0-2",
    goal: nutritionGoal,
    targetWeightKg: nutritionGoal === "maintain" ? undefined : answers.goalWeightKg,
    weeklyPaceKg: nutritionGoal === "maintain" ? undefined : answers.paceKgPerWeek,
    dietaryStyle: answers.diet,
    mealsPerDay: answers.mealsPerDay ? Number(answers.mealsPerDay) : undefined,
    calorieRollover: answers.rollover === "yes"
  };

  // Derive targets strictly from the nutrition engine - NO hardcoded values or fallbacks
  const planSnapshot = calculateNutritionTargets(engineInput, options?.referenceDate);
  const { targets } = planSnapshot;

  return {
    p_age_band: getAgeBandFromBirthDate(answers.birthDate),
    p_goal: nutritionGoal,
    p_sex_for_reference: sexForReference,
    p_country_code: options?.countryCode ?? null,
    p_display_name: options?.displayName ?? null,
    p_birth_date: engineInput.birthDate,
    p_sex_for_calculation: engineInput.sexForCalculation,
    p_height_cm: engineInput.heightCm,
    p_weight_kg: engineInput.weightKg,
    p_activity_level: engineInput.activityLevel,
    p_workouts_per_week: engineInput.workoutsPerWeek ?? "0-2",
    p_nutrition_goal: engineInput.goal,
    p_target_weight_kg: engineInput.targetWeightKg ?? null,
    p_weekly_pace_kg: engineInput.weeklyPaceKg ?? null,
    p_dietary_style: engineInput.dietaryStyle ?? null,
    p_meals_per_day: engineInput.mealsPerDay ?? null,
    p_calorie_rollover: engineInput.calorieRollover ?? false,
    p_target_calories: targets.calories,
    p_target_protein_grams: targets.proteinGrams,
    p_target_carbs_grams: targets.carbsGrams,
    p_target_fat_grams: targets.fatGrams,
    p_target_fiber_grams: targets.fiberGrams,
    p_target_water_ml: targets.waterMl,
    p_calculation_version: targets.engineVersion,
    p_calculated_at: targets.calculatedAt
  };
}
