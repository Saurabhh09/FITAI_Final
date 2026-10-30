import { describe, expect, it } from "vitest";
import {
  calculateBMI,
  calculateWeightGoalProgress,
  generateWeightTicks,
  filterWeightsByTimeframe,
  getCalendarWeekDays,
  aggregateWeekMacros,
  calculateWeeklyEnergy,
  calculateExpenditureChanges,
} from "./progress-domain";

describe("progress-domain", () => {
  describe("calculateBMI", () => {
    it("classifies underweight correctly", () => {
      // 50kg, 174cm -> 50 / (1.74^2) = 16.51
      const res = calculateBMI(50, 174);
      expect(res.category).toBe("underweight");
      expect(res.categoryLabel).toBe("Underweight");
      expect(res.bmi).toBe(16.51);
    });

    it("classifies healthy weight correctly", () => {
      // 65kg, 174cm -> 21.47
      const res = calculateBMI(65, 174);
      expect(res.category).toBe("healthy");
      expect(res.categoryLabel).toBe("Healthy");
      expect(res.bmi).toBe(21.47);
    });

    it("classifies overweight correctly", () => {
      // 80kg, 174cm -> 26.42
      const res = calculateBMI(80, 174);
      expect(res.category).toBe("overweight");
      expect(res.categoryLabel).toBe("Overweight");
    });

    it("classifies obese correctly", () => {
      // 100kg, 174cm -> 33.03
      const res = calculateBMI(100, 174);
      expect(res.category).toBe("obese");
      expect(res.categoryLabel).toBe("Obese");
    });
  });

  describe("calculateWeightGoalProgress", () => {
    it("calculates progress towards weight loss", () => {
      // Baseline 80kg, target 70kg, current 75kg -> 50%
      const res = calculateWeightGoalProgress(80, 75, 70);
      expect(res.percentOfGoal).toBe(50);
      expect(res.changeKg).toBe(-5);
    });

    it("calculates progress towards weight gain", () => {
      // Baseline 55kg, target 65kg, current 60kg -> 50%
      const res = calculateWeightGoalProgress(55, 60, 65);
      expect(res.percentOfGoal).toBe(50);
      expect(res.changeKg).toBe(5);
    });

    it("handles goal reached", () => {
      const res = calculateWeightGoalProgress(80, 70, 70);
      expect(res.percentOfGoal).toBe(100);
    });

    it("handles when weight moved away from goal", () => {
      // Loss goal from 80 to 70, but gained to 85
      const res = calculateWeightGoalProgress(80, 85, 70);
      expect(res.percentOfGoal).toBe(0);
      expect(res.changeKg).toBe(5);
    });
  });

  describe("generateWeightTicks", () => {
    it("generates 5 ticks correctly for standard weight range", () => {
      const ticks = generateWeightTicks(48, 52);
      expect(ticks).toHaveLength(5);
      expect(ticks[0]).toBe(52);
      expect(ticks[4]).toBe(48);
    });

    it("handles when min equals max", () => {
      const ticks = generateWeightTicks(50, 50);
      expect(ticks).toHaveLength(5);
      expect(ticks[2]).toBe(50);
    });
  });

  describe("filterWeightsByTimeframe", () => {
    const entries = [
      { id: "1", weightKg: 55, recordedAt: "2026-10-25T12:00:00Z" },
      { id: "2", weightKg: 54, recordedAt: "2026-06-01T12:00:00Z" },
      { id: "3", weightKg: 52, recordedAt: "2025-01-01T12:00:00Z" },
    ];

    it("filters to 90 days correctly", () => {
      const filtered = filterWeightsByTimeframe(entries, "90D", "2026-10-28");
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("1");
    });

    it("returns all when ALL is selected", () => {
      const filtered = filterWeightsByTimeframe(entries, "ALL", "2026-10-28");
      expect(filtered).toHaveLength(3);
    });
  });

  describe("getCalendarWeekDays", () => {
    it("returns 7 days starting from Sunday", () => {
      // 2026-10-28 is Wednesday
      const days = getCalendarWeekDays(0, "2026-10-28");
      expect(days).toHaveLength(7);
      expect(days[0]).toBe("2026-10-25"); // Sunday
      expect(days[3]).toBe("2026-10-28"); // Wednesday
      expect(days[6]).toBe("2026-10-31"); // Saturday
    });

    it("returns previous week when weekOffset = 1", () => {
      const days = getCalendarWeekDays(1, "2026-10-28");
      expect(days).toHaveLength(7);
      expect(days[0]).toBe("2026-10-18");
      expect(days[6]).toBe("2026-10-24");
    });
  });

  describe("aggregateWeekMacros", () => {
    it("computes average calories and macro totals accurately", () => {
      const weekDates = ["2026-10-25", "2026-10-26", "2026-10-27"];
      const dailyData = {
        "2026-10-25": { calories: 2000, protein: 120, carbs: 200, fat: 60 },
        "2026-10-26": { calories: 0, protein: 0, carbs: 0, fat: 0 },
        "2026-10-27": { calories: 1800, protein: 100, carbs: 180, fat: 50 },
      };

      const summary = aggregateWeekMacros(weekDates, dailyData);
      expect(summary.totalCalories).toBe(3800);
      // Average over days with calories: (2000 + 1800) / 2 = 1900
      expect(summary.averageCalories).toBe(1900);
      expect(summary.totalProtein).toBe(220);
      expect(summary.days[0].dayShort).toBe("Sun");
    });
  });

  describe("calculateWeeklyEnergy", () => {
    it("computes consumed, burned and net calories", () => {
      const weekDates = [
        { dateISO: "2026-10-25", dayShort: "Sun", dayLetter: "S", calories: 2000, protein: 100, carbs: 200, fat: 50, hasMeals: true },
        { dateISO: "2026-10-26", dayShort: "Mon", dayLetter: "M", calories: 2200, protein: 100, carbs: 200, fat: 50, hasMeals: true },
      ];
      const summary = calculateWeeklyEnergy(weekDates, 2000);
      expect(summary.consumedCalories).toBe(4200);
      expect(summary.burnedCalories).toBe(14000); // 2000 * 7
      expect(summary.netCalories).toBe(4200 - 14000);
    });
  });

  describe("calculateExpenditureChanges", () => {
    it("computes averages and trends across standard windows", () => {
      const daily = {
        "2026-10-28": 2500,
        "2026-10-27": 2400,
        "2026-10-26": 2300,
      };
      const rows = calculateExpenditureChanges(daily, 2400, "2026-10-28");
      expect(rows).toHaveLength(6);
      expect(rows[0].label).toBe("3 day");
      expect(rows[0].avgKcal).toBe(2400);
      expect(rows[0].trend).toBe("No change");
    });
  });
});
