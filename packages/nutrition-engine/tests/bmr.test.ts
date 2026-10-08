import { describe, expect, it } from "vitest";
import { calculateChronologicalAge, calculateMifflinStJeorBmr } from "../src/bmr";

describe("BMR & Chronological Age Calculation", () => {
  const refDate = new Date(Date.UTC(2026, 9, 5)); // Oct 5, 2026

  it("calculates exact chronological age correctly across calendar boundaries", () => {
    // Birthday earlier in the year -> already celebrated in 2026
    expect(calculateChronologicalAge("1996-05-15", refDate)).toBe(30);

    // Birthday later in the year -> not celebrated yet in 2026
    expect(calculateChronologicalAge("1996-11-20", refDate)).toBe(29);

    // Birthday on current date -> celebrated today
    expect(calculateChronologicalAge("1996-10-05", refDate)).toBe(30);

    // Leap day birthdate
    expect(calculateChronologicalAge("2000-02-29", refDate)).toBe(26);

    // Invalid dates
    expect(calculateChronologicalAge("not-a-date", refDate)).toBeNull();
    expect(calculateChronologicalAge("2001-02-29", refDate)).toBeNull(); // 2001 not leap year
    expect(calculateChronologicalAge("2030-01-01", refDate)).toBeNull(); // future
  });

  it("calculates male Mifflin-St Jeor BMR correctly", () => {
    // Male: 80 kg, 180 cm, 30 years old
    // BMR = (10 * 80) + (6.25 * 180) - (5 * 30) + 5
    //     = 800 + 1125 - 150 + 5 = 1780 kcal
    const result = calculateMifflinStJeorBmr(80, 180, "1996-05-15", "male", refDate);
    expect(result.bmrKcal).toBe(1780);
    expect(result.ageYears).toBe(30);
    expect(result.isMinor).toBe(false);
    expect(result.sexOffsetUsed).toBe(5);
  });

  it("calculates female Mifflin-St Jeor BMR correctly", () => {
    // Female: 60 kg, 165 cm, 30 years old
    // BMR = (10 * 60) + (6.25 * 165) - (5 * 30) - 161
    //     = 600 + 1031.25 - 150 - 161 = 1320.25 -> 1320 kcal
    const result = calculateMifflinStJeorBmr(60, 165, "1996-05-15", "female", refDate);
    expect(result.bmrKcal).toBe(1320);
    expect(result.ageYears).toBe(30);
    expect(result.isMinor).toBe(false);
    expect(result.sexOffsetUsed).toBe(-161);
  });

  it("calculates unspecified sex Mifflin-St Jeor BMR using neutral midpoint offset", () => {
    // Neutral: 70 kg, 170 cm, 25 years old
    // BMR = (10 * 70) + (6.25 * 170) - (5 * 25) - 78
    //     = 700 + 1062.5 - 125 - 78 = 1559.5 -> 1560 kcal
    const result = calculateMifflinStJeorBmr(70, 170, "2001-05-15", "unspecified", refDate);
    expect(result.bmrKcal).toBe(1560);
    expect(result.sexOffsetUsed).toBe(-78);
  });

  it("identifies minor status accurately", () => {
    const minorResult = calculateMifflinStJeorBmr(55, 160, "2010-01-01", "female", refDate);
    expect(minorResult.ageYears).toBe(16);
    expect(minorResult.isMinor).toBe(true);
  });

  it("throws descriptive errors for invalid inputs", () => {
    expect(() => calculateMifflinStJeorBmr(0, 170, "1995-01-01", "male", refDate)).toThrow(RangeError);
    expect(() => calculateMifflinStJeorBmr(-50, 170, "1995-01-01", "male", refDate)).toThrow(RangeError);
    expect(() => calculateMifflinStJeorBmr(70, 0, "1995-01-01", "male", refDate)).toThrow(RangeError);
    expect(() => calculateMifflinStJeorBmr(70, 170, "invalid-date", "male", refDate)).toThrow(TypeError);
  });
});
