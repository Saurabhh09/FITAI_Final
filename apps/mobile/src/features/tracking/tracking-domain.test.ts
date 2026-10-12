import { describe, expect, it } from "vitest";
import {
  calculateWaterProgress,
  formatWeightDisplay,
  kgToLb,
  lbToKg,
  QUICK_WATER_AMOUNTS_ML,
  validateWaterAmount,
  validateWeightInput,
} from "./tracking-domain";

describe("tracking-domain: water tracking", () => {
  it("provides standard quick water amounts", () => {
    expect(QUICK_WATER_AMOUNTS_ML).toEqual([250, 350, 500, 750, 1000]);
  });

  describe("validateWaterAmount", () => {
    it("accepts valid positive numbers and numeric strings", () => {
      expect(validateWaterAmount(250)).toEqual({ ok: true, volumeMl: 250 });
      expect(validateWaterAmount("500")).toEqual({ ok: true, volumeMl: 500 });
      expect(validateWaterAmount(" 750 ")).toEqual({ ok: true, volumeMl: 750 });
      expect(validateWaterAmount(10000)).toEqual({ ok: true, volumeMl: 10000 });
    });

    it("rounds floating point milliliters to whole integers", () => {
      expect(validateWaterAmount("333.6")).toEqual({ ok: true, volumeMl: 334 });
    });

    it("rejects zero and negative numbers", () => {
      expect(validateWaterAmount(0)).toEqual({
        ok: false,
        error: "Water amount must be greater than zero.",
      });
      expect(validateWaterAmount(-100)).toEqual({
        ok: false,
        error: "Water amount must be greater than zero.",
      });
      expect(validateWaterAmount("-250")).toEqual({
        ok: false,
        error: "Water amount must be greater than zero.",
      });
    });

    it("rejects empty, NaN, and non-numeric inputs", () => {
      expect(validateWaterAmount("")).toEqual({
        ok: false,
        error: "Please enter a valid water amount in milliliters.",
      });
      expect(validateWaterAmount("   ")).toEqual({
        ok: false,
        error: "Please enter a valid water amount in milliliters.",
      });
      expect(validateWaterAmount("abc")).toEqual({
        ok: false,
        error: "Please enter a valid water amount in milliliters.",
      });
      expect(validateWaterAmount(NaN)).toEqual({
        ok: false,
        error: "Please enter a valid water amount in milliliters.",
      });
      expect(validateWaterAmount(Infinity)).toEqual({
        ok: false,
        error: "Please enter a valid water amount in milliliters.",
      });
    });

    it("rejects amounts exceeding daily maximum limit (10,000 ml)", () => {
      expect(validateWaterAmount(10001)).toEqual({
        ok: false,
        error: "Water amount exceeds reasonable daily limit (10,000 ml).",
      });
    });
  });

  describe("calculateWaterProgress", () => {
    it("handles zero consumed water", () => {
      const progress = calculateWaterProgress(0, 2500);
      expect(progress.consumedMl).toBe(0);
      expect(progress.targetMl).toBe(2500);
      expect(progress.remainingMl).toBe(2500);
      expect(progress.progressRatio).toBe(0);
      expect(progress.isGoalMet).toBe(false);
    });

    it("handles partial consumption accurately", () => {
      const progress = calculateWaterProgress(1250, 2500);
      expect(progress.consumedMl).toBe(1250);
      expect(progress.targetMl).toBe(2500);
      expect(progress.remainingMl).toBe(1250);
      expect(progress.progressRatio).toBe(0.5);
      expect(progress.isGoalMet).toBe(false);
    });

    it("handles meeting the target exactly", () => {
      const progress = calculateWaterProgress(2500, 2500);
      expect(progress.consumedMl).toBe(2500);
      expect(progress.remainingMl).toBe(0);
      expect(progress.progressRatio).toBe(1);
      expect(progress.isGoalMet).toBe(true);
    });

    it("handles over-target consumption without capping consumed amount", () => {
      // 3500 consumed with 3000 target
      const progress = calculateWaterProgress(3500, 3000);
      expect(progress.consumedMl).toBe(3500);
      expect(progress.targetMl).toBe(3000);
      expect(progress.remainingMl).toBe(0);
      expect(progress.progressRatio).toBe(1); // progress bar capped at 100%
      expect(progress.isGoalMet).toBe(true);
    });

    it("handles zero or negative targets gracefully", () => {
      const progress = calculateWaterProgress(500, 0);
      expect(progress.consumedMl).toBe(500);
      expect(progress.targetMl).toBe(0);
      expect(progress.remainingMl).toBe(0);
      expect(progress.progressRatio).toBe(1);
      expect(progress.isGoalMet).toBe(true);
    });
  });
});

describe("tracking-domain: weight tracking", () => {
  describe("unit conversions (lb <-> kg)", () => {
    it("accurately converts kg to lb with 1 decimal place", () => {
      expect(kgToLb(70)).toBe(154.3);
      expect(kgToLb(80.5)).toBe(177.5);
      expect(kgToLb(100)).toBe(220.5);
    });

    it("accurately converts lb to kg with 2 decimal places", () => {
      expect(lbToKg(154.32)).toBe(70);
      expect(lbToKg(176.37)).toBe(80);
      expect(lbToKg(220.46)).toBe(100);
    });

    it("formats display weight cleanly with fallback", () => {
      expect(formatWeightDisplay(75.5, "kg")).toBe("75.5 kg");
      expect(formatWeightDisplay(70, "lb")).toBe("154.3 lb");
      expect(formatWeightDisplay(null, "kg")).toBe("--");
      expect(formatWeightDisplay(undefined, "kg")).toBe("--");
    });
  });

  describe("validateWeightInput", () => {
    it("validates and accepts valid kg input", () => {
      const res = validateWeightInput(75.5, "kg");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.weightKg).toBe(75.5);
      }
    });

    it("validates and accepts valid lb input, storing canonical kg", () => {
      const res = validateWeightInput("165.3", "lb");
      expect(res.ok).toBe(true);
      if (res.ok) {
        // 165.3 lb * 0.45359237 = 74.98 kg
        expect(res.weightKg).toBe(74.98);
      }
    });

    it("rejects empty and whitespace inputs", () => {
      expect(validateWeightInput("", "kg")).toEqual({
        ok: false,
        error: "Please enter your weight.",
      });
      expect(validateWeightInput("   ", "kg")).toEqual({
        ok: false,
        error: "Please enter your weight.",
      });
    });

    it("rejects non-numeric inputs, NaN, and Infinity", () => {
      expect(validateWeightInput("abc", "kg")).toEqual({
        ok: false,
        error: "Please enter a valid numeric weight.",
      });
      expect(validateWeightInput(NaN, "kg")).toEqual({
        ok: false,
        error: "Please enter a valid numeric weight.",
      });
      expect(validateWeightInput(Infinity, "kg")).toEqual({
        ok: false,
        error: "Please enter a valid numeric weight.",
      });
    });

    it("rejects zero and negative numbers", () => {
      expect(validateWeightInput(0, "kg")).toEqual({
        ok: false,
        error: "Weight must be greater than zero.",
      });
      expect(validateWeightInput(-50, "kg")).toEqual({
        ok: false,
        error: "Weight must be greater than zero.",
      });
    });

    it("enforces physiologic bounds [20 kg, 500 kg]", () => {
      // Under minimum in kg
      expect(validateWeightInput(15, "kg")).toEqual({
        ok: false,
        error: "Weight must be between 20 kg (44 lb) and 500 kg (1102 lb).",
      });
      // Under minimum in lb (e.g. 30 lb = 13.6 kg < 20 kg)
      expect(validateWeightInput(30, "lb")).toEqual({
        ok: false,
        error: "Weight must be between 20 kg (44 lb) and 500 kg (1102 lb).",
      });
      // Above maximum in kg
      expect(validateWeightInput(550, "kg")).toEqual({
        ok: false,
        error: "Weight must be between 20 kg (44 lb) and 500 kg (1102 lb).",
      });
      // Above maximum in lb (1200 lb = 544 kg > 500 kg)
      expect(validateWeightInput(1200, "lb")).toEqual({
        ok: false,
        error: "Weight must be between 20 kg (44 lb) and 500 kg (1102 lb).",
      });
    });
  });
});
