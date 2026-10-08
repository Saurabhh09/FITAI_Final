/**
 * @fitai/nutrition-engine - Unit Conversion & Precision Utilities
 */

export const LBS_PER_KG = 2.20462262185;
export const CM_PER_INCH = 2.54;
export const ML_PER_FL_OZ = 29.5735295625;

export function roundToDecimal(value: number, decimalPlaces = 1): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function kgToLb(kg: number, decimalPlaces = 1): number {
  if (!Number.isFinite(kg) || kg <= 0) return 0;
  return roundToDecimal(kg * LBS_PER_KG, decimalPlaces);
}

export function lbToKg(lb: number, decimalPlaces = 2): number {
  if (!Number.isFinite(lb) || lb <= 0) return 0;
  return roundToDecimal(lb / LBS_PER_KG, decimalPlaces);
}

export function cmToInches(cm: number, decimalPlaces = 1): number {
  if (!Number.isFinite(cm) || cm <= 0) return 0;
  return roundToDecimal(cm / CM_PER_INCH, decimalPlaces);
}

export function inchesToCm(inches: number, decimalPlaces = 1): number {
  if (!Number.isFinite(inches) || inches <= 0) return 0;
  return roundToDecimal(inches * CM_PER_INCH, decimalPlaces);
}

export function cmToFtIn(cm: number): { feet: number; inches: number } {
  if (!Number.isFinite(cm) || cm <= 0) return { feet: 0, inches: 0 };
  const totalInches = Math.round(cm / CM_PER_INCH);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return { feet, inches };
}

export function ftInToCm(feet: number, inches: number, decimalPlaces = 1): number {
  const safeFeet = Number.isFinite(feet) && feet > 0 ? feet : 0;
  const safeInches = Number.isFinite(inches) && inches > 0 ? inches : 0;
  const totalInches = safeFeet * 12 + safeInches;
  return roundToDecimal(totalInches * CM_PER_INCH, decimalPlaces);
}

export function mlToFlOz(ml: number, decimalPlaces = 1): number {
  if (!Number.isFinite(ml) || ml <= 0) return 0;
  return roundToDecimal(ml / ML_PER_FL_OZ, decimalPlaces);
}

export function flOzToMl(flOz: number, decimalPlaces = 0): number {
  if (!Number.isFinite(flOz) || flOz <= 0) return 0;
  return roundToDecimal(flOz * ML_PER_FL_OZ, decimalPlaces);
}
