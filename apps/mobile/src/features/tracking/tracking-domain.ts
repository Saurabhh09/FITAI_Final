export type WeightUnit = "kg" | "lb";

export const QUICK_WATER_AMOUNTS_ML = [250, 350, 500, 750, 1000] as const;

export type WaterProgress = {
  consumedMl: number;
  targetWaterMl: number;
  targetMl: number;
  remainingMl: number;
  percentage: number;
  progressRatio: number;
  isOverTarget: boolean;
  isGoalMet: boolean;
};

export function calculateWaterProgress(consumedMl: number, targetWaterMl: number): WaterProgress {
  const consumed = Math.max(0, Math.round(consumedMl || 0));
  const target = Math.max(0, Math.round(targetWaterMl || 0));
  const remaining = Math.max(0, target - consumed);
  const percentage = target > 0 ? Math.round((consumed / target) * 100) : 0;
  const progressRatio = target > 0 ? Math.min(1, consumed / target) : 1;
  const isGoalMet = target > 0 ? consumed >= target : true;
  const isOverTarget = target > 0 && consumed > target;

  return {
    consumedMl: consumed,
    targetWaterMl: target,
    targetMl: target,
    remainingMl: remaining,
    percentage,
    progressRatio,
    isOverTarget,
    isGoalMet,
  };
}

export type WaterValidationResult =
  | { ok: true; volumeMl: number }
  | { ok: false; error: string };

export function validateWaterAmount(amount: number | string): WaterValidationResult {
  if (typeof amount === "string" && amount.trim() === "") {
    return { ok: false, error: "Please enter a valid water amount in milliliters." };
  }

  const num = typeof amount === "number" ? amount : Number(String(amount).trim());

  if (!Number.isFinite(num) || isNaN(num)) {
    return { ok: false, error: "Please enter a valid water amount in milliliters." };
  }
  if (num <= 0) {
    return { ok: false, error: "Water amount must be greater than zero." };
  }
  if (num > 10000) {
    return { ok: false, error: "Water amount exceeds reasonable daily limit (10,000 ml)." };
  }

  return { ok: true, volumeMl: Math.round(num) };
}

export function lbToKg(lb: number): number {
  return Math.round(lb * 0.45359237 * 100) / 100;
}

export function kgToLb(kg: number): number {
  return Math.round(kg * 2.20462262 * 10) / 10;
}

export function formatWeightDisplay(weightKg: number | null | undefined, unit: WeightUnit = "kg"): string {
  if (weightKg == null || !Number.isFinite(weightKg)) {
    return "--";
  }
  if (unit === "lb") {
    return `${kgToLb(weightKg)} lb`;
  }
  return `${Math.round(weightKg * 10) / 10} kg`;
}

export type WeightValidationResult =
  | { ok: true; weightKg: number }
  | { ok: false; error: string };

export function validateWeightInput(
  rawVal: number | string,
  unit: WeightUnit = "kg"
): WeightValidationResult {
  if (typeof rawVal === "string" && rawVal.trim() === "") {
    return { ok: false, error: "Please enter your weight." };
  }

  const num = typeof rawVal === "number" ? rawVal : Number(String(rawVal).trim());

  if (!Number.isFinite(num) || isNaN(num)) {
    return { ok: false, error: "Please enter a valid numeric weight." };
  }
  if (num <= 0) {
    return { ok: false, error: "Weight must be greater than zero." };
  }

  const weightKg = unit === "lb" ? lbToKg(num) : Math.round(num * 10) / 10;

  if (weightKg < 20.0 || weightKg > 500.0) {
    return {
      ok: false,
      error: "Weight must be between 20 kg (44 lb) and 500 kg (1102 lb).",
    };
  }

  return { ok: true, weightKg };
}
