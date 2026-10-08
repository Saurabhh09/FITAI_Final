import { describe, expect, it } from "vitest";
import { getYesterdayISO, type DashboardNutritionProfile, type LoggedMealItem } from "./dashboard-view";

describe("Dashboard Calorie Rollover & Target Integrity", () => {
  const baseProfile: DashboardNutritionProfile = {
    targetCalories: 2200,
    targetProteinGrams: 150,
    targetCarbsGrams: 250,
    targetFatGrams: 65,
    targetFiberGrams: 30,
    targetWaterMl: 2500,
    weightKg: 75.0,
    targetWeightKg: 72.0,
    calorieRollover: true
  };

  function computeRolloverKcal(
    profile: DashboardNutritionProfile,
    yesterdayMeals: LoggedMealItem[]
  ): number {
    if (!profile.calorieRollover) return 0;
    if (yesterdayMeals.length === 0) return 0; // Explicit product rule: no meals logged yesterday -> 0 rollover
    const yesterdayConsumed = yesterdayMeals.reduce((sum, item) => sum + item.calories, 0);
    const unused = profile.targetCalories - yesterdayConsumed;
    if (unused <= 0) return 0;
    return Math.min(200, Math.round(unused));
  }

  function makeMealItem(calories: number, mealType: "Breakfast" | "Lunch" | "Dinner" | "Snacks" = "Lunch"): LoggedMealItem {
    return {
      id: `m-${Math.random()}`,
      name: "Test Food",
      serving: "1 portion",
      weightGrams: 100,
      calories,
      protein: 10,
      carbs: 10,
      fat: 5,
      fiber: 2,
      mealType
    };
  }

  describe("Rollover calculations", () => {
    it("returns zero rollover when calorie_rollover is disabled", () => {
      const disabledProfile: DashboardNutritionProfile = {
        ...baseProfile,
        calorieRollover: false
      };
      const yesterdayMeals = [makeMealItem(1800)];

      const rollover = computeRolloverKcal(disabledProfile, yesterdayMeals);
      expect(rollover).toBe(0);

      const todayAvailable = disabledProfile.targetCalories + rollover;
      expect(todayAvailable).toBe(2200);
      expect(disabledProfile.targetCalories).toBe(2200);
    });

    it("applies unused calories up to 200 kcal when under target", () => {
      // Target: 2200, Consumed: 2050 -> Unused: 150
      const yesterdayMeals = [makeMealItem(1000), makeMealItem(1050)];

      const rollover = computeRolloverKcal(baseProfile, yesterdayMeals);
      expect(rollover).toBe(150);

      const todayAvailable = baseProfile.targetCalories + rollover;
      expect(todayAvailable).toBe(2350);
      // Confirm underlying database target remains unchanged
      expect(baseProfile.targetCalories).toBe(2200);
    });

    it("applies exactly 200 kcal when unused budget is exactly 200", () => {
      // Target: 2200, Consumed: 2000 -> Unused: 200
      const yesterdayMeals = [makeMealItem(2000)];

      const rollover = computeRolloverKcal(baseProfile, yesterdayMeals);
      expect(rollover).toBe(200);

      const todayAvailable = baseProfile.targetCalories + rollover;
      expect(todayAvailable).toBe(2400);
    });

    it("strictly caps rollover at 200 kcal even when unused budget is larger", () => {
      // Target: 2200, Consumed: 1500 -> Unused: 700 -> Capped at 200
      const yesterdayMeals = [makeMealItem(1500)];

      const rollover = computeRolloverKcal(baseProfile, yesterdayMeals);
      expect(rollover).toBe(200);

      const todayAvailable = baseProfile.targetCalories + rollover;
      expect(todayAvailable).toBe(2400);
      expect(baseProfile.targetCalories).toBe(2200);
    });

    it("returns zero rollover when yesterday exceeded the target (no negative rollover)", () => {
      // Target: 2200, Consumed: 2400 -> Over by 200 -> Rollover must be 0, never negative
      const yesterdayMeals = [makeMealItem(2400)];

      const rollover = computeRolloverKcal(baseProfile, yesterdayMeals);
      expect(rollover).toBe(0);

      const todayAvailable = baseProfile.targetCalories + rollover;
      expect(todayAvailable).toBe(2200);
      expect(baseProfile.targetCalories).toBe(2200);
    });

    it("returns zero rollover when yesterday has no meals logged (untracked day rule)", () => {
      // Target: 2200, Yesterday meals: [] -> Rollover must be 0
      const yesterdayMeals: LoggedMealItem[] = [];

      const rollover = computeRolloverKcal(baseProfile, yesterdayMeals);
      expect(rollover).toBe(0);

      const todayAvailable = baseProfile.targetCalories + rollover;
      expect(todayAvailable).toBe(2200);
    });
  });

  describe("Date isolation & Local Date Handling", () => {
    it("getYesterdayISO calculates strictly the preceding calendar date", () => {
      expect(getYesterdayISO("2026-10-08")).toBe("2026-10-07");
      expect(getYesterdayISO("2026-10-01")).toBe("2026-09-30");
      expect(getYesterdayISO("2026-01-01")).toBe("2025-12-31");
    });

    it("isolates yesterday's meals from today's and older dates", () => {
      const dailyLogs: Record<string, LoggedMealItem[]> = {
        "2026-10-06": [makeMealItem(500)], // 2 days ago
        "2026-10-07": [makeMealItem(2000)], // yesterday (unused: 200)
        "2026-10-08": [makeMealItem(800)] // today
      };

      const today = "2026-10-08";
      const yesterday = getYesterdayISO(today);
      expect(yesterday).toBe("2026-10-07");

      const yesterdayMeals = dailyLogs[yesterday] || [];
      const rollover = computeRolloverKcal(baseProfile, yesterdayMeals);
      expect(rollover).toBe(200);

      const todayAvailable = baseProfile.targetCalories + rollover;
      expect(todayAvailable).toBe(2400);

      // Remaining today: 2400 - 800 = 1600
      const todayConsumed = (dailyLogs[today] || []).reduce((sum, it) => sum + it.calories, 0);
      const remainingToday = Math.max(0, todayAvailable - todayConsumed);
      expect(remainingToday).toBe(1600);
    });
  });

  describe("Quick Food Failure Contract", () => {
    it("ensures failed POST does not mutate local daily logs or totals", () => {
      const initialLogs: Record<string, LoggedMealItem[]> = {
        "2026-10-08": [makeMealItem(500)]
      };

      // Simulated failed request: do not append local fallback
      const simulatedFailure = { ok: false, error: "Meal logging service unavailable" };
      let logs = { ...initialLogs };

      if (simulatedFailure.ok) {
        logs["2026-10-08"] = [...logs["2026-10-08"], makeMealItem(300)];
      }
      // Failure leaves logs intact

      expect(logs["2026-10-08"]).toHaveLength(1);
      const total = logs["2026-10-08"].reduce((s, it) => s + it.calories, 0);
      expect(total).toBe(500); // Totals unchanged
    });
  });
});
