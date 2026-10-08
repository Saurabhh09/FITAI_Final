import { describe, expect, it } from "vitest";
import {
  ACTIVITY_MULTIPLIERS,
  ENERGY_ADJUSTMENT_BOUNDS,
  FAT_PARAMETERS,
  FIBER_PARAMETERS,
  KCAL_PER_KG_WEIGHT_CHANGE,
  PROTEIN_PARAMETERS
} from "../src/constants";
import { calculateEstimatedHydration } from "../src/hydration";
import { calculateNutritionTargets } from "../src/targets";
import { calculateTdee } from "../src/tdee";
import type { UserNutritionProfileInput } from "../src/types";

describe("FITAI - STEP A: Nutrition Engine Corrections Verification", () => {
  const refDate = new Date(Date.UTC(2026, 9, 5));

  // 1. Activity levels use: 1.20 / 1.375 / 1.55 / 1.725
  it("1. Activity levels strictly match FAO/WHO/UNU PAL multipliers", () => {
    expect(ACTIVITY_MULTIPLIERS.sedentary).toBe(1.20);
    expect(ACTIVITY_MULTIPLIERS.light).toBe(1.375);
    expect(ACTIVITY_MULTIPLIERS.moderate).toBe(1.55);
    expect(ACTIVITY_MULTIPLIERS.very).toBe(1.725);
  });

  // 2. workouts_per_week does NOT add an extra TDEE multiplier
  it("2. workouts_per_week does not independently add to TDEE", () => {
    const bmr = 1600;
    const resNoWorkouts = calculateTdee(bmr, "moderate");
    const resWithWorkouts = calculateTdee(bmr, "moderate", "6+");

    expect(resNoWorkouts.tdeeKcal).toBe(Math.round(bmr * 1.55));
    expect(resWithWorkouts.tdeeKcal).toBe(Math.round(bmr * 1.55));
    expect(resWithWorkouts.tdeeKcal).toBe(resNoWorkouts.tdeeKcal);
    expect(resWithWorkouts.workoutBonusMultiplier).toBe(0);
    expect(resWithWorkouts.totalMultiplier).toBe(1.55);
  });

  // 3. Adult calorie adjustment remains deterministic
  it("3. Adult calorie adjustment is deterministic and mathematically consistent", () => {
    const input: UserNutritionProfileInput = {
      birthDate: "1990-05-15",
      sexForCalculation: "male",
      heightCm: 180,
      weightKg: 80,
      activityLevel: "moderate",
      goal: "lose_weight",
      targetWeightKg: 75,
      weeklyPaceKg: 0.50
    };

    const run1 = calculateNutritionTargets(input, refDate);
    const run2 = calculateNutritionTargets(input, refDate);

    // BMR = 10(80) + 6.25(180) - 5(36) + 5 = 800 + 1125 - 180 + 5 = 1750 kcal
    // TDEE = 1750 * 1.55 = 2712.5 -> 2713 kcal
    // Deficit: (0.5 * 7700) / 7 = 550 kcal
    // Raw calories = 2713 - 550 = 2163 -> rounded to 2160 kcal
    expect(run1.dailyCalorieAdjustmentKcal).toBe(-550);
    expect(run1.targets.calories).toBe(2160);
    expect(run1).toEqual(run2);
  });

  // 4. 7700 kcal/kg is treated/documented as an approximation
  it("4. 7700 kcal/kg constant exists as standard engineering heuristic", () => {
    expect(KCAL_PER_KG_WEIGHT_CHANGE).toBe(7700);
  });

  // 5. Deficit/surplus bounds remain engineering/product bounds
  it("5. Deficit (250-600) and surplus (200-450) bounds are enforced", () => {
    expect(ENERGY_ADJUSTMENT_BOUNDS.MIN_DEFICIT_KCAL).toBe(250);
    expect(ENERGY_ADJUSTMENT_BOUNDS.MAX_DEFICIT_KCAL).toBe(600);
    expect(ENERGY_ADJUSTMENT_BOUNDS.MIN_SURPLUS_KCAL).toBe(200);
    expect(ENERGY_ADJUSTMENT_BOUNDS.MAX_SURPLUS_KCAL).toBe(450);

    const highPaceInput: UserNutritionProfileInput = {
      birthDate: "1990-05-15",
      sexForCalculation: "male",
      heightCm: 180,
      weightKg: 80,
      activityLevel: "moderate",
      goal: "lose_weight",
      weeklyPaceKg: 1.5 // 1.5 * 7700 / 7 = 1650 kcal -> capped to 600
    };
    const highPacePlan = calculateNutritionTargets(highPaceInput, refDate);
    expect(highPacePlan.dailyCalorieAdjustmentKcal).toBe(-600);

    const lowPaceInput: UserNutritionProfileInput = {
      birthDate: "1990-05-15",
      sexForCalculation: "male",
      heightCm: 180,
      weightKg: 80,
      activityLevel: "moderate",
      goal: "gain_weight",
      weeklyPaceKg: 0.1 // 0.1 * 7700 / 7 = 110 kcal -> clamped to min 200
    };
    const lowPacePlan = calculateNutritionTargets(lowPaceInput, refDate);
    expect(lowPacePlan.dailyCalorieAdjustmentKcal).toBe(200);
  });

  // 6. Protein/fat/fiber calculations remain deterministic
  it("6. Protein, fat, and fiber bounds remain deterministic", () => {
    expect(PROTEIN_PARAMETERS.LOSS_DEFICIT_TARGET_G_PER_KG).toBe(2.0);
    expect(PROTEIN_PARAMETERS.GAIN_SURPLUS_TARGET_G_PER_KG).toBe(1.8);
    expect(PROTEIN_PARAMETERS.MAINTAIN_TARGET_G_PER_KG).toBe(1.4);
    expect(PROTEIN_PARAMETERS.HIGH_PROTEIN_OVERRIDE_G_PER_KG).toBe(2.2);
    expect(FAT_PARAMETERS.TARGET_CALORIC_RATIO).toBe(0.25);
    expect(FAT_PARAMETERS.ABSOLUTE_MIN_FAT_G).toBe(35);
    expect(FIBER_PARAMETERS.GRAMS_PER_1000_KCAL).toBe(14);
    expect(FIBER_PARAMETERS.MIN_FIBER_G).toBe(20);
    expect(FIBER_PARAMETERS.MAX_RECOMMENDED_FIBER_G).toBe(50);
  });

  // 7. Target weight is never automatically invented
  it("7. Target weight is never invented (no +/- 5kg assumption)", () => {
    const loseNoTargetInput: UserNutritionProfileInput = {
      birthDate: "1992-01-01",
      sexForCalculation: "female",
      heightCm: 165,
      weightKg: 70,
      activityLevel: "moderate",
      goal: "lose_weight"
      // targetWeightKg intentionally omitted
    };

    const plan = calculateNutritionTargets(loseNoTargetInput, refDate);
    expect(plan.targetWeightKg).toBeNull();
    expect(plan.weightDiffKg).toBeNull();
    expect(plan.estimatedWeeksToGoal).toBeNull();
    expect(plan.projectedTargetDate).toBeNull();
    expect(plan.projectedTargetDateFormatted).toBeNull();
  });

  // 8. Missing loss/gain target weight remains null/unset
  it("8. Missing gain target weight remains null/unset without inventing a number", () => {
    const gainNoTargetInput: UserNutritionProfileInput = {
      birthDate: "1995-03-01",
      sexForCalculation: "male",
      heightCm: 175,
      weightKg: 65,
      activityLevel: "light",
      goal: "gain_weight"
      // targetWeightKg intentionally omitted
    };

    const plan = calculateNutritionTargets(gainNoTargetInput, refDate);
    expect(plan.targetWeightKg).toBeNull();
    expect(plan.weightDiffKg).toBeNull();
    expect(plan.estimatedWeeksToGoal).toBeNull();
    expect(plan.projectedTargetDate).toBeNull();
    expect(plan.projectedTargetDateFormatted).toBeNull();
  });

  // 9. Maintain target weight behaves correctly
  it("9. Maintain target weight equals current weight with 0 diff and 0 weeks", () => {
    const maintainInput: UserNutritionProfileInput = {
      birthDate: "1990-01-01",
      sexForCalculation: "male",
      heightCm: 180,
      weightKg: 78,
      activityLevel: "moderate",
      goal: "maintain"
    };

    const plan = calculateNutritionTargets(maintainInput, refDate);
    expect(plan.targetWeightKg).toBe(78);
    expect(plan.weightDiffKg).toBe(0);
    expect(plan.estimatedWeeksToGoal).toBe(0);
    expect(plan.projectedTargetDate).toBe("2026-10-05");
    expect(plan.dailyCalorieAdjustmentKcal).toBe(0);
    expect(plan.isMaintain).toBe(true);
  });

  // 10. Hydration remains deterministic and is described as an estimate
  it("10. Hydration calculation remains deterministic (35 mL/kg + 400 mL workouts) with disclaimer", () => {
    const hydrationNoWorkouts = calculateEstimatedHydration(70, "0-2");
    // 70 * 35 = 2450 mL
    expect(hydrationNoWorkouts.targetWaterMl).toBe(2450);

    const hydrationWithWorkouts = calculateEstimatedHydration(70, "3-5");
    // 70 * 35 + 400 = 2850 mL
    expect(hydrationWithWorkouts.targetWaterMl).toBe(2850);

    expect(hydrationWithWorkouts.disclaimer).toContain("not a medical prescription");
  });

  // 11. Under-18 + lose_weight never produces an adult calorie deficit
  it("11. Minor (<18) requesting lose_weight NEVER receives a calorie deficit or masked deficit", () => {
    const minorInput: UserNutritionProfileInput = {
      birthDate: "2010-01-01", // 16 years old in Oct 2026
      sexForCalculation: "male",
      heightCm: 170,
      weightKg: 65,
      activityLevel: "moderate",
      goal: "lose_weight",
      weeklyPaceKg: 0.50
    };

    const plan = calculateNutritionTargets(minorInput, refDate);

    expect(plan.isMinor).toBe(true);
    expect(plan.isWeightLoss).toBe(false);
    expect(plan.isMaintain).toBe(true);
    expect(plan.isWeightGain).toBe(false);
    expect(plan.dailyCalorieAdjustmentKcal).toBe(0);
    // Target calories must equal maintenance (TDEE rounded to nearest 10 kcal) without any deficit subtraction
    expect(plan.targets.calories).toBe(Math.round(plan.tdeeKcal / 10) * 10);
    // Target weight for neutralized maintain plan equals current weight
    expect(plan.targetWeightKg).toBe(65);
    expect(plan.weightDiffKg).toBe(0);
    expect(plan.estimatedWeeksToGoal).toBe(0);
    // Protein uses maintain baseline (1.4 g/kg), not loss deficit protein (2.0 g/kg)
    expect(plan.targets.proteinGrams).toBe(Math.round(65 * 1.4));
    // Explicit minor disclaimer attached
    expect(plan.disclaimer).toContain("For individuals under 18");
    expect(plan.targets.disclaimer).toContain("For individuals under 18");
  });

  it("11b. Minor (<18) with maintain goal receives baseline maintenance targets with minor disclaimer", () => {
    const minorMaintainInput: UserNutritionProfileInput = {
      birthDate: "2009-08-15", // 17 years old
      sexForCalculation: "female",
      heightCm: 162,
      weightKg: 55,
      activityLevel: "light",
      goal: "maintain"
    };

    const plan = calculateNutritionTargets(minorMaintainInput, refDate);

    expect(plan.isMinor).toBe(true);
    expect(plan.isWeightLoss).toBe(false);
    expect(plan.isMaintain).toBe(true);
    expect(plan.dailyCalorieAdjustmentKcal).toBe(0);
    expect(plan.targetWeightKg).toBe(55);
    expect(plan.weightDiffKg).toBe(0);
    expect(plan.estimatedWeeksToGoal).toBe(0);
    expect(plan.disclaimer).toContain("For individuals under 18");
  });

  it("11c. Minor (<18) with gain_weight goal does NOT generate invented target weight if omitted", () => {
    const minorGainInput: UserNutritionProfileInput = {
      birthDate: "2010-03-20", // 16 years old
      sexForCalculation: "male",
      heightCm: 175,
      weightKg: 60,
      activityLevel: "moderate",
      goal: "gain_weight"
      // targetWeightKg omitted
    };

    const plan = calculateNutritionTargets(minorGainInput, refDate);

    expect(plan.isMinor).toBe(true);
    expect(plan.isWeightGain).toBe(true);
    expect(plan.isWeightLoss).toBe(false);
    expect(plan.dailyCalorieAdjustmentKcal).toBeGreaterThan(0); // surplus
    // Target weight and timeline must remain null (no invented target weight)
    expect(plan.targetWeightKg).toBeNull();
    expect(plan.weightDiffKg).toBeNull();
    expect(plan.estimatedWeeksToGoal).toBeNull();
    expect(plan.projectedTargetDate).toBeNull();
    expect(plan.disclaimer).toContain("For individuals under 18");
  });

  // 12. Existing adult calculations continue to work
  it("12. Adult calculations with explicit target weight continue to work accurately", () => {
    const adultInput: UserNutritionProfileInput = {
      birthDate: "1992-06-15",
      sexForCalculation: "female",
      heightCm: 168,
      weightKg: 68,
      activityLevel: "light",
      goal: "lose_weight",
      targetWeightKg: 62,
      weeklyPaceKg: 0.40
    };

    const plan = calculateNutritionTargets(adultInput, refDate);

    expect(plan.isMinor).toBe(false);
    expect(plan.isWeightLoss).toBe(true);
    expect(plan.targetWeightKg).toBe(62);
    expect(plan.weightDiffKg).toBe(6);
    expect(plan.estimatedWeeksToGoal).toBe(15);
    expect(plan.dailyCalorieAdjustmentKcal).toBe(-440);
    expect(plan.targets.calories).toBeGreaterThanOrEqual(1200);
    expect(plan.disclaimer).not.toContain("For individuals under 18");
  });
});
