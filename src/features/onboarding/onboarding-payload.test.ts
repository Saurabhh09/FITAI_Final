import { describe, expect, it } from "vitest";
import {
  buildOnboardingRpcPayload,
  getAgeBandFromBirthDate,
  mapQuestionnaireGoal,
  mapQuestionnaireSex
} from "./onboarding-payload";
import type { QuestionnaireAnswers } from "./questionnaire";

describe("Onboarding Payload Mapping & Nutrition Engine Contract", () => {
  const adultAnswers: QuestionnaireAnswers = {
    goal: "gain",
    birthDate: "1998-05-15",
    sex: "male",
    heightCm: 180,
    weightKg: 75,
    activity: "moderate",
    workouts: "3-5",
    goalWeightKg: 80,
    paceKgPerWeek: 0.25,
    diet: "high-protein",
    mealsPerDay: "4",
    rollover: "yes",
    allergies: ["peanuts", "tree-nuts"],
    health: ["health-condition"]
  };

  it("maps onboarding answers to all required complete_onboarding RPC parameters", () => {
    const payload = buildOnboardingRpcPayload(adultAnswers, {
      displayName: "Jane Doe",
      countryCode: "US"
    });

    // Profile & Goal fields
    expect(payload.p_display_name).toBe("Jane Doe");
    expect(payload.p_country_code).toBe("US");
    expect(payload.p_goal).toBe("gain_weight");
    expect(payload.p_age_band).toBe("18_29");
    expect(payload.p_sex_for_reference).toBe("male");

    // Baseline nutrition fields in canonical metric units
    expect(payload.p_birth_date).toBe("1998-05-15");
    expect(payload.p_sex_for_calculation).toBe("male");
    expect(payload.p_height_cm).toBe(180);
    expect(payload.p_weight_kg).toBe(75);
    expect(payload.p_activity_level).toBe("moderate");
    expect(payload.p_workouts_per_week).toBe("3-5");
    expect(payload.p_nutrition_goal).toBe("gain_weight");
    expect(payload.p_target_weight_kg).toBe(80);
    expect(payload.p_weekly_pace_kg).toBe(0.25);
    expect(payload.p_dietary_style).toBe("high-protein");
    expect(payload.p_meals_per_day).toBe(4);
    expect(payload.p_calorie_rollover).toBe(true);

    // Derived target snapshot fields from @fitai/nutrition-engine
    expect(payload.p_target_calories).toBeGreaterThanOrEqual(1000);
    expect(payload.p_target_calories).toBeLessThanOrEqual(6000);
    expect(payload.p_target_protein_grams).toBeGreaterThanOrEqual(30);
    expect(payload.p_target_carbs_grams).toBeGreaterThanOrEqual(0);
    expect(payload.p_target_fat_grams).toBeGreaterThanOrEqual(20);
    expect(payload.p_target_fiber_grams).toBeGreaterThanOrEqual(10);
    expect(payload.p_target_water_ml).toBeGreaterThanOrEqual(1000);
    expect(payload.p_calculation_version).toBe("1.0.0");
    expect(typeof payload.p_calculated_at).toBe("string");
  });

  it("maps sex correctly for calculation and reference", () => {
    expect(mapQuestionnaireSex("male")).toEqual({
      sexForCalculation: "male",
      sexForReference: "male"
    });
    expect(mapQuestionnaireSex("female")).toEqual({
      sexForCalculation: "female",
      sexForReference: "female"
    });
    expect(mapQuestionnaireSex("other")).toEqual({
      sexForCalculation: "unspecified",
      sexForReference: "unspecified"
    });
    expect(mapQuestionnaireSex(undefined)).toEqual({
      sexForCalculation: "unspecified",
      sexForReference: "unspecified"
    });
  });

  it("maps goal correctly", () => {
    expect(mapQuestionnaireGoal("lose")).toBe("lose_weight");
    expect(mapQuestionnaireGoal("maintain")).toBe("maintain");
    expect(mapQuestionnaireGoal("gain")).toBe("gain_weight");
    expect(mapQuestionnaireGoal(undefined)).toBe("maintain");
  });

  it("nullifies target weight and pace for maintain goal", () => {
    const maintainAnswers: QuestionnaireAnswers = {
      ...adultAnswers,
      goal: "maintain",
      goalWeightKg: 85, // should be ignored for maintain
      paceKgPerWeek: 0.5 // should be ignored for maintain
    };
    const payload = buildOnboardingRpcPayload(maintainAnswers);

    expect(payload.p_nutrition_goal).toBe("maintain");
    expect(payload.p_target_weight_kg).toBeNull();
    expect(payload.p_weekly_pace_kg).toBeNull();
  });

  it("preserves optional dietaryStyle, mealsPerDay, and rollover defaults", () => {
    const minimalAnswers: QuestionnaireAnswers = {
      goal: "maintain",
      birthDate: "1990-01-01",
      sex: "female",
      heightCm: 165,
      weightKg: 60,
      activity: "light"
    };
    const payload = buildOnboardingRpcPayload(minimalAnswers);

    expect(payload.p_workouts_per_week).toBe("0-2");
    expect(payload.p_dietary_style).toBeNull();
    expect(payload.p_meals_per_day).toBeNull();
    expect(payload.p_calorie_rollover).toBe(false);
  });

  it("does NOT persist sensitive health-context answers (privacy boundary)", () => {
    const payload = buildOnboardingRpcPayload(adultAnswers);
    const keys = Object.keys(payload);

    expect(keys).not.toContain("allergies");
    expect(keys).not.toContain("health");
    expect(keys).not.toContain("foodPrefs");
    expect(keys).not.toContain("barriers");
    expect(keys).not.toContain("p_allergies");
    expect(keys).not.toContain("p_health");
  });

  it("preserves minor safety: blocks weight loss deficit for users under 18", () => {
    const minorLoseAnswers: QuestionnaireAnswers = {
      ...adultAnswers,
      birthDate: "2010-06-15", // ~16 years old
      goal: "lose",
      goalWeightKg: 70,
      paceKgPerWeek: 0.25
    };

    expect(() => buildOnboardingRpcPayload(minorLoseAnswers)).toThrow(
      "Weight-loss plans are not available for minors or unconfirmed age."
    );
  });

  it("allows minors to complete onboarding with maintain or gain goals (no age gate)", () => {
    const minorGainAnswers: QuestionnaireAnswers = {
      ...adultAnswers,
      birthDate: "2010-06-15", // ~16 years old
      goal: "gain",
      goalWeightKg: 80,
      paceKgPerWeek: 0.25
    };
    const payload = buildOnboardingRpcPayload(minorGainAnswers);

    expect(payload.p_age_band).toBe("13_17");
    expect(payload.p_nutrition_goal).toBe("gain_weight");
    expect(payload.p_target_calories).toBeGreaterThan(1500);

    const minorMaintainAnswers: QuestionnaireAnswers = {
      ...adultAnswers,
      birthDate: "2010-06-15",
      goal: "maintain"
    };
    const maintainPayload = buildOnboardingRpcPayload(minorMaintainAnswers);
    expect(maintainPayload.p_age_band).toBe("13_17");
    expect(maintainPayload.p_nutrition_goal).toBe("maintain");
  });

  it("fails safely and prevents invalid profile persistence when inputs are out of bounds", () => {
    expect(() =>
      buildOnboardingRpcPayload({ ...adultAnswers, heightCm: 80 })
    ).toThrow("Height must be between 100 and 260 cm.");

    expect(() =>
      buildOnboardingRpcPayload({ ...adultAnswers, weightKg: 20 })
    ).toThrow("Weight must be between 30 and 350 kg.");

    expect(() =>
      buildOnboardingRpcPayload({ ...adultAnswers, birthDate: "invalid-date" })
    ).toThrow("A valid birth date is required for nutrition calculation.");
  });

  it("maps birthDate to correct age bands across all life stages", () => {
    // Reference check
    const currentYear = new Date().getFullYear();
    expect(getAgeBandFromBirthDate(`${currentYear - 10}-01-01`)).toBe("under_13");
    expect(getAgeBandFromBirthDate(`${currentYear - 15}-01-01`)).toBe("13_17");
    expect(getAgeBandFromBirthDate(`${currentYear - 25}-01-01`)).toBe("18_29");
    expect(getAgeBandFromBirthDate(`${currentYear - 40}-01-01`)).toBe("30_49");
    expect(getAgeBandFromBirthDate(`${currentYear - 60}-01-01`)).toBe("50_69");
    expect(getAgeBandFromBirthDate(`${currentYear - 75}-01-01`)).toBe("70_plus");
  });

  it("Step 19 calculateUserPlan delegates strictly to @fitai/nutrition-engine", async () => {
    const { calculateUserPlan } = await import("./plan-calc");
    const plan = calculateUserPlan(adultAnswers, new Date(Date.UTC(2026, 9, 5)));

    expect(plan.engineVersion).toBe("1.0.0");
    expect(plan.isWeightGain).toBe(true);
    expect(plan.targets.calories).toBeGreaterThanOrEqual(1500);
    expect(plan.targetWeightKg).toBe(80);
    expect(plan.weightDiffKg).toBe(5);
    expect(plan.estimatedWeeksToGoal).toBe(20);
    expect(plan.targets.proteinGrams).toBeGreaterThan(100);
  });
});
