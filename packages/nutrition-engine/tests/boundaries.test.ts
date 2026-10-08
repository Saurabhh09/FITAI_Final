import { describe, expect, it } from "vitest";
import { calculateNutritionTargets } from "../src/targets";
import type { UserNutritionProfileInput } from "../src/types";

describe("Nutrition Calculation Engine - Safety & Boundary Tests", () => {
  const refDate = new Date(Date.UTC(2026, 9, 5));

  it("safely blocks caloric deficits for minors and enforces maintenance", () => {
    const minorInput: UserNutritionProfileInput = {
      birthDate: "2010-04-12", // 16 years old in Oct 2026
      sexForCalculation: "female",
      heightCm: 160,
      weightKg: 58,
      activityLevel: "sedentary",
      goal: "lose_weight", // Minor requesting weight loss
      weeklyPaceKg: 0.50
    };

    const plan = calculateNutritionTargets(minorInput, refDate);

    expect(plan.isMinor).toBe(true);
    // Deficit should be deactivated for minors
    expect(plan.isWeightLoss).toBe(false);
    expect(plan.isMaintain).toBe(true);
    expect(plan.dailyCalorieAdjustmentKcal).toBe(0);
    expect(plan.targets.calories).toBe(Math.round(plan.tdeeKcal / 10) * 10);
  });

  it("enforces absolute minimum caloric floor for small adult females with aggressive deficits", () => {
    const petiteFemaleInput: UserNutritionProfileInput = {
      birthDate: "1995-01-01",
      sexForCalculation: "female",
      heightCm: 148,
      weightKg: 44,
      activityLevel: "sedentary", // Very low TDEE
      goal: "lose_weight",
      weeklyPaceKg: 0.50 // Aggressive deficit requested
    };

    const plan = calculateNutritionTargets(petiteFemaleInput, refDate);

    // BMR = 10(44) + 6.25(148) - 5(31) - 161 = 440 + 925 - 155 - 161 = 1049 kcal
    // TDEE = 1049 * 1.2 = 1259 kcal
    // A 500 kcal deficit would plunge her to ~759 kcal (unsafe crash diet!)
    // The engine MUST enforce the female caloric floor of 1200 kcal.
    expect(plan.targets.calories).toBeGreaterThanOrEqual(1200);
  });

  it("enforces absolute minimum caloric floor for adult males", () => {
    const smallMaleInput: UserNutritionProfileInput = {
      birthDate: "1997-01-01",
      sexForCalculation: "male",
      heightCm: 155,
      weightKg: 48,
      activityLevel: "sedentary",
      goal: "lose_weight",
      weeklyPaceKg: 0.50
    };

    const plan = calculateNutritionTargets(smallMaleInput, refDate);
    // The engine MUST enforce the male caloric floor of 1500 kcal.
    expect(plan.targets.calories).toBeGreaterThanOrEqual(1500);
  });

  it("clamps excessive weight loss deficits to MAX_DEFICIT_KCAL (600 kcal)", () => {
    const input: UserNutritionProfileInput = {
      birthDate: "1990-01-01",
      sexForCalculation: "male",
      heightCm: 185,
      weightKg: 100,
      activityLevel: "moderate",
      goal: "lose_weight",
      weeklyPaceKg: 1.2 // Extremely aggressive pace requested (1.2 kg/week = ~1320 kcal/day deficit)
    };

    const plan = calculateNutritionTargets(input, refDate);
    // Must be capped at -600 kcal
    expect(plan.dailyCalorieAdjustmentKcal).toBe(-600);
  });

  it("clamps excessive weight gain surplus to MAX_SURPLUS_KCAL (450 kcal)", () => {
    const input: UserNutritionProfileInput = {
      birthDate: "1995-01-01",
      sexForCalculation: "male",
      heightCm: 175,
      weightKg: 65,
      activityLevel: "light",
      goal: "gain_weight",
      weeklyPaceKg: 1.0 // 1 kg/wk = 1100 kcal surplus
    };

    const plan = calculateNutritionTargets(input, refDate);
    // Must be capped at +450 kcal
    expect(plan.dailyCalorieAdjustmentKcal).toBe(450);
  });

  it("enforces minimum dietary fat floor (at least 35g)", () => {
    const input: UserNutritionProfileInput = {
      birthDate: "1995-01-01",
      sexForCalculation: "female",
      heightCm: 150,
      weightKg: 45,
      activityLevel: "sedentary",
      goal: "lose_weight",
      weeklyPaceKg: 0.25
    };

    const plan = calculateNutritionTargets(input, refDate);
    expect(plan.targets.fatGrams).toBeGreaterThanOrEqual(35);
  });
});
