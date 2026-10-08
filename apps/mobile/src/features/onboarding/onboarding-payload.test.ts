import { describe, expect, it } from "vitest";
import {
  buildOnboardingRpcPayload,
  getAgeBandFromBirthDate,
  mapQuestionnaireGoal,
  mapQuestionnaireSex
} from "./onboarding-payload";
import { prepareMobileOnboardingSubmission } from "./onboarding-service";
import type { QuestionnaireAnswers } from "./questionnaire";

describe("Mobile Onboarding Payload & Engine Integration", () => {
  const sampleAnswers: QuestionnaireAnswers = {
    goal: "gain",
    birthDate: "1995-10-20",
    sex: "female",
    heightCm: 168,
    weightKg: 58,
    activity: "moderate",
    workouts: "3-5",
    goalWeightKg: 62,
    paceKgPerWeek: 0.25,
    diet: "mediterranean",
    mealsPerDay: "3",
    rollover: "yes",
    allergies: ["gluten"],
    health: ["none"]
  };

  it("builds the exact RPC parameters required by complete_onboarding", () => {
    const res = prepareMobileOnboardingSubmission(sampleAnswers, { displayName: "Sam" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.payload.p_display_name).toBe("Sam");
    expect(res.payload.p_birth_date).toBe("1995-10-20");
    expect(res.payload.p_sex_for_calculation).toBe("female");
    expect(res.payload.p_nutrition_goal).toBe("gain_weight");
    expect(res.payload.p_target_calories).toBeGreaterThanOrEqual(1000);
    expect(res.payload.p_target_protein_grams).toBeGreaterThanOrEqual(30);
    expect(res.payload.p_target_carbs_grams).toBeGreaterThanOrEqual(0);
    expect(res.payload.p_target_fat_grams).toBeGreaterThanOrEqual(20);
    expect(res.payload.p_target_fiber_grams).toBeGreaterThanOrEqual(10);
    expect(res.payload.p_target_water_ml).toBeGreaterThanOrEqual(1000);
    expect(res.payload.p_calculation_version).toBe("1.0.0");
  });

  it("safely rejects under-18 weight loss plans on mobile", () => {
    const minorAnswers: QuestionnaireAnswers = {
      ...sampleAnswers,
      birthDate: "2010-01-01",
      goal: "lose"
    };

    const res = prepareMobileOnboardingSubmission(minorAnswers);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("Weight-loss plans are not available for minors or unconfirmed age.");
    }
  });

  it("allows under-18 non-weight-loss plans on mobile", () => {
    const minorAnswers: QuestionnaireAnswers = {
      ...sampleAnswers,
      birthDate: "2010-01-01",
      goal: "gain"
    };

    const res = prepareMobileOnboardingSubmission(minorAnswers);
    expect(res.ok).toBe(true);
  });

  it("Step 19 calculateUserPlan on mobile delegates strictly to @fitai/nutrition-engine", async () => {
    const { calculateUserPlan } = await import("./plan-calc");
    const plan = calculateUserPlan(sampleAnswers, new Date(Date.UTC(2026, 9, 5)));

    expect(plan.engineVersion).toBe("1.0.0");
    expect(plan.isWeightGain).toBe(true);
    expect(plan.targets.calories).toBeGreaterThanOrEqual(1500);
    expect(plan.targetWeightKg).toBe(62);
    expect(plan.weightDiffKg).toBe(4);
    expect(plan.estimatedWeeksToGoal).toBe(16);
  });
});
