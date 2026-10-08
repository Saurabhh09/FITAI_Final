import { describe, expect, it } from "vitest";
import { calculateNutritionTargets } from "../src/targets";
import type { UserNutritionProfileInput } from "../src/types";

describe("Nutrition Calculation Engine - End-to-End", () => {
  const refDate = new Date(Date.UTC(2026, 9, 5));

  it("calculates realistic, bounded targets for weight loss", () => {
    const input: UserNutritionProfileInput = {
      birthDate: "1994-06-15", // 32 years
      sexForCalculation: "female",
      heightCm: 165,
      weightKg: 70,
      activityLevel: "moderate", // 1.55
      workoutsPerWeek: "3-5",    // +0.05 -> 1.60
      goal: "lose_weight",
      targetWeightKg: 64,
      weeklyPaceKg: 0.40
    };

    const plan = calculateNutritionTargets(input, refDate);

    // BMR = 10(70) + 6.25(165) - 5(32) - 161 = 700 + 1031.25 - 160 - 161 = 1410.25 -> 1410 kcal
    expect(plan.bmrKcal).toBe(1410);
    // TDEE = 1410 * 1.55 = 2185.5 -> 2186 kcal (moderate activity = 1.55, no workout bonus added to TDEE)
    expect(plan.tdeeKcal).toBe(2186);

    // Deficit for 0.4 kg/wk: (0.4 * 7700) / 7 = 440 kcal deficit
    expect(plan.dailyCalorieAdjustmentKcal).toBe(-440);
    // Target calories: 2186 - 440 = 1746 -> rounded to 1750 kcal
    expect(plan.targets.calories).toBe(1750);

    // Protein: 70 kg * 2.0 g/kg = 140g
    expect(plan.targets.proteinGrams).toBe(140);

    // Fat: 25% of 1750 = 437.5 kcal / 9 = ~49g
    expect(plan.targets.fatGrams).toBe(49);

    // Carbs: Remaining calories: 1750 - (140 * 4 + 49 * 9) = 1750 - (560 + 441) = 749 kcal / 4 = ~187g
    expect(plan.targets.carbsGrams).toBe(187);

    // Fiber: (1750 / 1000) * 14 = 24.5 -> 25g
    expect(plan.targets.fiberGrams).toBe(25);

    // Hydration: 70 * 35 = 2450 + 400 = 2850 mL
    expect(plan.targets.waterMl).toBe(2850);

    // Weight timeline: 6 kg difference at 0.4 kg/wk = 15 weeks
    expect(plan.weightDiffKg).toBe(6);
    expect(plan.estimatedWeeksToGoal).toBe(15);
    expect(plan.isWeightLoss).toBe(true);
    expect(plan.isMinor).toBe(false);
  });

  it("calculates realistic targets for weight gain with high-protein eating style", () => {
    const input: UserNutritionProfileInput = {
      birthDate: "1998-03-20", // 28 years
      sexForCalculation: "male",
      heightCm: 182,
      weightKg: 75,
      activityLevel: "very", // 1.725 (very active PAL, no workout bonus added to TDEE)
      workoutsPerWeek: "6+",
      goal: "gain_weight",
      targetWeightKg: 80,
      weeklyPaceKg: 0.25,
      dietaryStyle: "high-protein"
    };

    const plan = calculateNutritionTargets(input, refDate);

    // BMR = 10(75) + 6.25(182) - 5(28) + 5 = 750 + 1137.5 - 140 + 5 = 1752.5 -> 1753 kcal
    expect(plan.bmrKcal).toBe(1753);
    // TDEE = 1753 * 1.725 = 3023.925 -> 3024 kcal
    expect(plan.tdeeKcal).toBe(3024);

    // Surplus for 0.25 kg/wk: (0.25 * 7700) / 7 = 275 kcal surplus
    expect(plan.dailyCalorieAdjustmentKcal).toBe(275);
    // Target calories: 3024 + 275 = 3299 -> rounded to 3300 kcal
    expect(plan.targets.calories).toBe(3300);

    // High protein on gain: 80 kg target weight * 2.2 g/kg = 176g
    expect(plan.targets.proteinGrams).toBe(176);

    // Fat: 25% of 3300 = 825 kcal / 9 = ~92g
    expect(plan.targets.fatGrams).toBe(92);

    // Carbs: 3300 - (176 * 4 + 92 * 9) = 3300 - (704 + 828) = 1768 kcal / 4 = ~442g
    expect(plan.targets.carbsGrams).toBe(442);

    // Weeks: 5 kg / 0.25 = 20 weeks
    expect(plan.estimatedWeeksToGoal).toBe(20);
    expect(plan.isWeightGain).toBe(true);
  });

  it("calculates realistic targets for maintenance", () => {
    const input: UserNutritionProfileInput = {
      birthDate: "1990-01-01",
      sexForCalculation: "unspecified",
      heightCm: 170,
      weightKg: 68,
      activityLevel: "light",
      goal: "maintain"
    };

    const plan = calculateNutritionTargets(input, refDate);
    expect(plan.dailyCalorieAdjustmentKcal).toBe(0);
    expect(plan.isMaintain).toBe(true);
    expect(plan.estimatedWeeksToGoal).toBe(0);
    expect(plan.weightDiffKg).toBe(0);
  });

  it("maintains Atwater caloric summation alignment within practical rounding tolerance", () => {
    const input: UserNutritionProfileInput = {
      birthDate: "1992-08-10",
      sexForCalculation: "female",
      heightCm: 160,
      weightKg: 62,
      activityLevel: "moderate",
      goal: "lose_weight",
      targetWeightKg: 58,
      weeklyPaceKg: 0.35
    };

    const plan = calculateNutritionTargets(input, refDate);
    const macroKcal =
      plan.targets.proteinGrams * 4 +
      plan.targets.carbsGrams * 4 +
      plan.targets.fatGrams * 9;

    // Macro sum should match target calories within 10 kcal due to rounding individual grams
    expect(Math.abs(macroKcal - plan.targets.calories)).toBeLessThanOrEqual(10);
  });

  it("is 100% deterministic (identical inputs produce identical results)", () => {
    const input: UserNutritionProfileInput = {
      birthDate: "1995-12-01",
      sexForCalculation: "male",
      heightCm: 175,
      weightKg: 78,
      activityLevel: "moderate",
      goal: "lose_weight",
      targetWeightKg: 72,
      weeklyPaceKg: 0.40
    };

    const run1 = calculateNutritionTargets(input, refDate);
    const run2 = calculateNutritionTargets(input, refDate);

    expect(run1).toEqual(run2);
  });
});
