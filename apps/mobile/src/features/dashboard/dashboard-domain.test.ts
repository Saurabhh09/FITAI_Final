import { describe, expect, it } from "vitest";
import {
  calculateDailyNutritionTotals,
  calculateUserStreak,
  computeRolloverKcal,
  formatDisplayDate,
  getDayRingStatus,
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

  describe("Streak Calculations", () => {
    it("returns 0 when user has never logged any meals", () => {
      const res = calculateUserStreak([], "2026-10-28");
      expect(res.currentStreak).toBe(0);
      expect(res.longestStreak).toBe(0);
    });

    it("calculates active streak when logged today", () => {
      const dates = ["2026-10-26", "2026-10-27", "2026-10-28"];
      const res = calculateUserStreak(dates, "2026-10-28");
      expect(res.currentStreak).toBe(3);
      expect(res.longestStreak).toBe(3);
    });

    it("keeps streak active when user logged yesterday but not yet today", () => {
      const dates = ["2026-10-26", "2026-10-27"];
      const res = calculateUserStreak(dates, "2026-10-28");
      expect(res.currentStreak).toBe(2);
      expect(res.longestStreak).toBe(2);
    });

    it("breaks current streak when yesterday was missed, preserving longest streak", () => {
      const dates = ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-24"];
      const res = calculateUserStreak(dates, "2026-10-28");
      expect(res.currentStreak).toBe(0);
      expect(res.longestStreak).toBe(3);
    });
  });

  describe("Calendar Day Ring Colors (Calories Left Rules)", () => {
    it("returns future for upcoming days", () => {
      expect(getDayRingStatus(0, 2000, false, true)).toBe("future");
    });

    it("returns dotted when no meals were logged", () => {
      expect(getDayRingStatus(0, 2000, false, false)).toBe("dotted");
    });

    it("returns on_target (green) when all calories taken or less than 100 calories left", () => {
      // 50 calories left (1950 of 2000 consumed)
      expect(getDayRingStatus(1950, 2000, true, false)).toBe("on_target");
      // exactly all calories taken (0 left)
      expect(getDayRingStatus(2000, 2000, true, false)).toBe("on_target");
      // exceeded target calories (negative left)
      expect(getDayRingStatus(2100, 2000, true, false)).toBe("on_target");
      // exactly 100 calories left
      expect(getDayRingStatus(1900, 2000, true, false)).toBe("on_target");
    });

    it("returns yellow (orange) when between 100 and 200 calories left", () => {
      // 199 calories left (e.g. 2221 of 2420)
      expect(getDayRingStatus(2221, 2420, true, false)).toBe("yellow");
      // 150 calories left
      expect(getDayRingStatus(1850, 2000, true, false)).toBe("yellow");
      // 101 calories left
      expect(getDayRingStatus(1899, 2000, true, false)).toBe("yellow");
      // exactly 200 calories left
      expect(getDayRingStatus(1800, 2000, true, false)).toBe("yellow");
    });

    it("returns red when more than 200 calories are left", () => {
      // 201 calories left
      expect(getDayRingStatus(1799, 2000, true, false)).toBe("red");
      // only breakfast logged (e.g. 500 of 2000 consumed -> 1500 left)
      expect(getDayRingStatus(500, 2000, true, false)).toBe("red");
    });
  });
});
