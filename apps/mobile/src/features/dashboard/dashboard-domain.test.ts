import { describe, expect, it } from "vitest";
import {
  calculateDailyNutritionTotals,
  computeRolloverKcal,
  formatDisplayDate,
  getTomorrowISO,
  getYesterdayISO,
  groupMealItemsIntoBuckets,
  todayISO,
  type LoggedMealItem,
} from "./dashboard-domain";

describe("Mobile Dashboard Domain Logic", () => {
  describe("Calorie Rollover Calculations", () => {
    it("returns 0 rollover when rollover is disabled", () => {
      const yesterdayMeals = [{ calories: 1800 }];
      const rollover = computeRolloverKcal(2200, false, yesterdayMeals);
      expect(rollover).toBe(0);
    });

    it("returns 0 rollover when no meals were logged yesterday (explicit product rule)", () => {
      const yesterdayMeals: Array<{ calories: number }> = [];
      const rollover = computeRolloverKcal(2200, true, yesterdayMeals);
      expect(rollover).toBe(0);
    });

    it("applies unused calories up to 200 kcal when under target", () => {
      // Target: 2200, Consumed: 2050 -> Unused: 150
      const yesterdayMeals = [{ calories: 1000 }, { calories: 1050 }];
      const rollover = computeRolloverKcal(2200, true, yesterdayMeals);
      expect(rollover).toBe(150);
    });

    it("strictly caps rollover at 200 kcal even when unused budget is larger", () => {
      // Target: 2200, Consumed: 1500 -> Unused: 700 -> Capped at 200
      const yesterdayMeals = [{ calories: 1500 }];
      const rollover = computeRolloverKcal(2200, true, yesterdayMeals);
      expect(rollover).toBe(200);
    });

    it("returns 0 rollover when yesterday exceeded target (never negative)", () => {
      // Target: 2200, Consumed: 2500 -> Over by 300 -> Rollover must be 0
      const yesterdayMeals = [{ calories: 2500 }];
      const rollover = computeRolloverKcal(2200, true, yesterdayMeals);
      expect(rollover).toBe(0);
    });

    it("applies exactly 200 kcal when unused budget is exactly 200", () => {
      const yesterdayMeals = [{ calories: 2000 }];
      const rollover = computeRolloverKcal(2200, true, yesterdayMeals);
      expect(rollover).toBe(200);
    });
  });

  describe("Daily Nutrition Totals Aggregation", () => {
    it("returns zeros when meals list is empty (real zero state)", () => {
      const totals = calculateDailyNutritionTotals([]);
      expect(totals).toEqual({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
      });
    });

    it("correctly aggregates calories and macros across items", () => {
      const items = [
        { calories: 350, protein: 30.2, carbs: 40.5, fat: 8.1, fiber: 5.2 },
        { calories: 250, protein: 12.3, carbs: 32.1, fat: 9.4, fiber: 2.1 },
      ];

      const totals = calculateDailyNutritionTotals(items);
      expect(totals.calories).toBe(600);
      expect(totals.protein).toBe(42.5);
      expect(totals.carbs).toBe(72.6);
      expect(totals.fat).toBe(17.5);
      expect(totals.fiber).toBe(7.3);
    });
  });

  describe("Date Handling Utilities", () => {
    it("computes previous and next days consistently with ISO YYYY-MM-DD", () => {
      const date = "2026-03-01";
      expect(getYesterdayISO(date)).toBe("2026-02-28");
      expect(getTomorrowISO(date)).toBe("2026-03-02");
    });

    it("formats relative display labels for today, yesterday, tomorrow", () => {
      const today = todayISO();
      const yesterday = getYesterdayISO(today);
      const tomorrow = getTomorrowISO(today);

      expect(formatDisplayDate(today)).toBe("Today");
      expect(formatDisplayDate(yesterday)).toBe("Yesterday");
      expect(formatDisplayDate(tomorrow)).toBe("Tomorrow");
    });
  });

  describe("Meal Buckets Organization", () => {
    it("creates standard 4 buckets and populates items accordingly", () => {
      const items: LoggedMealItem[] = [
        {
          id: "item-1",
          name: "Oatmeal",
          serving: "100g",
          weightGrams: 100,
          calories: 300,
          protein: 10,
          carbs: 50,
          fat: 5,
          fiber: 4,
          mealType: "Breakfast",
        },
        {
          id: "item-2",
          name: "Apple",
          serving: "150g",
          weightGrams: 150,
          calories: 80,
          protein: 0.5,
          carbs: 20,
          fat: 0.2,
          fiber: 3,
          mealType: "Snacks",
        },
      ];

      const buckets = groupMealItemsIntoBuckets(items);
      expect(buckets).toHaveLength(4);

      const breakfast = buckets.find((b) => b.mealType === "Breakfast");
      const lunch = buckets.find((b) => b.mealType === "Lunch");
      const dinner = buckets.find((b) => b.mealType === "Dinner");
      const snacks = buckets.find((b) => b.mealType === "Snacks");

      expect(breakfast?.items).toHaveLength(1);
      expect(breakfast?.totals.calories).toBe(300);
      expect(lunch?.items).toHaveLength(0);
      expect(lunch?.totals.calories).toBe(0);
      expect(dinner?.items).toHaveLength(0);
      expect(snacks?.items).toHaveLength(1);
      expect(snacks?.totals.calories).toBe(80);
    });
  });
});
