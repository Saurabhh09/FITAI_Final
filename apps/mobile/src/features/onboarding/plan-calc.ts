/**
 * @fitai/mobile - Plan Calculation Adapter
 *
 * Thin adapter delegating strictly to the shared @fitai/nutrition-engine.
 * Contains ZERO duplicated nutrition business logic or formulas.
 */

import {
  calculateNutritionTargets,
  type CalculatedPlanSnapshot,
  type UserNutritionProfileInput
} from "@fitai/nutrition-engine";
import { mapQuestionnaireGoal, mapQuestionnaireSex } from "./onboarding-payload";
import type { QuestionnaireAnswers } from "./questionnaire";

export function mapQuestionnaireToEngineInput(answers: QuestionnaireAnswers): UserNutritionProfileInput {
  const { sexForCalculation } = mapQuestionnaireSex(answers.sex);
  const nutritionGoal = mapQuestionnaireGoal(answers.goal);

  return {
    birthDate: answers.birthDate || "1998-01-01",
    sexForCalculation,
    heightCm: typeof answers.heightCm === "number" && answers.heightCm > 0 ? answers.heightCm : 170,
    weightKg: typeof answers.weightKg === "number" && answers.weightKg > 0 ? answers.weightKg : 70,
    activityLevel: answers.activity || "moderate",
    workoutsPerWeek: answers.workouts ?? "0-2",
    goal: nutritionGoal,
    targetWeightKg: nutritionGoal === "maintain" ? undefined : answers.goalWeightKg,
    weeklyPaceKg: nutritionGoal === "maintain" ? undefined : answers.paceKgPerWeek,
    dietaryStyle: answers.diet,
    mealsPerDay: answers.mealsPerDay ? Number(answers.mealsPerDay) : undefined,
    calorieRollover: answers.rollover === "yes"
  };
}

export function calculateUserPlan(
  answers: QuestionnaireAnswers,
  referenceDate: Date = new Date()
): CalculatedPlanSnapshot {
  const engineInput = mapQuestionnaireToEngineInput(answers);
  return calculateNutritionTargets(engineInput, referenceDate);
}
