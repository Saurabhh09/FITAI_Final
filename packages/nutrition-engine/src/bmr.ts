/**
 * @fitai/nutrition-engine - BMR / Resting Metabolic Rate Calculation
 *
 * Implements the Mifflin-St Jeor (1990) predictive equation.
 * BMR = (10 * weight_kg) + (6.25 * height_cm) - (5 * age_years) + sex_offset
 */

import { MIFFLIN_ST_JEOR_CONSTANTS } from "./constants";
import type { SexForCalculation } from "./types";

/**
 * Calculates exact chronological age in completed years from an ISO birth date (YYYY-MM-DD).
 * Returns null if the date format is invalid or represents a future date.
 */
export function calculateChronologicalAge(birthDate: string, referenceDate: Date = new Date()): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;

  const [year, month, day] = birthDate.split("-").map(Number);
  const birth = new Date(Date.UTC(year, month - 1, day));

  // Check valid calendar date
  if (
    birth.getUTCFullYear() !== year ||
    birth.getUTCMonth() !== month - 1 ||
    birth.getUTCDate() !== day
  ) {
    return null;
  }

  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth() + 1;
  const refDay = referenceDate.getUTCDate();

  let age = refYear - year;
  if (refMonth < month || (refMonth === month && refDay < day)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export type BmrCalculationResult = Readonly<{
  bmrKcal: number;
  ageYears: number;
  isMinor: boolean;
  sexOffsetUsed: number;
}>;

/**
 * Calculates Basal Metabolic Rate using Mifflin-St Jeor.
 */
export function calculateMifflinStJeorBmr(
  weightKg: number,
  heightCm: number,
  birthDate: string,
  sex: SexForCalculation,
  referenceDate: Date = new Date()
): BmrCalculationResult {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new RangeError(`weightKg must be a positive finite number, received: ${weightKg}`);
  }
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    throw new RangeError(`heightCm must be a positive finite number, received: ${heightCm}`);
  }

  const age = calculateChronologicalAge(birthDate, referenceDate);
  if (age === null) {
    throw new TypeError(`Invalid birthDate string provided: "${birthDate}". Must be YYYY-MM-DD.`);
  }

  let sexOffset: number;
  if (sex === "male") {
    sexOffset = MIFFLIN_ST_JEOR_CONSTANTS.SEX_OFFSET_MALE;
  } else if (sex === "female") {
    sexOffset = MIFFLIN_ST_JEOR_CONSTANTS.SEX_OFFSET_FEMALE;
  } else {
    sexOffset = MIFFLIN_ST_JEOR_CONSTANTS.SEX_OFFSET_UNSPECIFIED;
  }

  const bmr =
    MIFFLIN_ST_JEOR_CONSTANTS.WEIGHT_MULTIPLIER * weightKg +
    MIFFLIN_ST_JEOR_CONSTANTS.HEIGHT_MULTIPLIER * heightCm -
    MIFFLIN_ST_JEOR_CONSTANTS.AGE_MULTIPLIER * age +
    sexOffset;

  return {
    bmrKcal: Math.round(bmr),
    ageYears: age,
    isMinor: age < 18,
    sexOffsetUsed: sexOffset
  };
}
