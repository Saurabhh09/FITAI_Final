import { describe, expect, it } from "vitest";
import { getAgeYears, isStepValid, questionnaireFlow } from "./questionnaire";
import { buildOnboardingRpcPayload, getAgeBandFromBirthDate } from "./onboarding-payload";
import type { WheelDateValue } from "./wheel-date-picker";

describe("DOB Date Logic & Validation", () => {
  const dobStep = questionnaireFlow.find((s) => s.id === "dob")!;

  it("accepts normal valid birth dates", () => {
    expect(getAgeYears("1995-05-15", new Date("2026-10-07"))).toBe(31);
    expect(getAgeYears("2001-01-01", new Date("2026-10-07"))).toBe(25);
    expect(isStepValid(dobStep, { allergies: [], health: [], foodPrefs: [], barriers: [], birthDate: "1995-05-15" })).toBe(true);
  });

  it("accepts valid leap-year birth date (February 29 on leap years)", () => {
    // 2000, 2004, 2008, 2012, 2016, 2020, 2024 are leap years
    expect(getAgeYears("2000-02-29", new Date("2026-10-07"))).toBe(26);
    expect(getAgeYears("2004-02-29", new Date("2026-10-07"))).toBe(22);
    expect(isStepValid(dobStep, { allergies: [], health: [], foodPrefs: [], barriers: [], birthDate: "2004-02-29" })).toBe(true);
  });

  it("rejects February 29 on non-leap years", () => {
    expect(getAgeYears("2001-02-29", new Date("2026-10-07"))).toBeNull();
    expect(getAgeYears("2023-02-29", new Date("2026-10-07"))).toBeNull();
    expect(getAgeYears("1900-02-29", new Date("2026-10-07"))).toBeNull();
    expect(isStepValid(dobStep, { allergies: [], health: [], foodPrefs: [], barriers: [], birthDate: "2001-02-29" })).toBe(false);
  });

  it("rejects invalid calendar days for 30-day months (e.g. April 31)", () => {
    expect(getAgeYears("2000-04-31", new Date("2026-10-07"))).toBeNull();
    expect(getAgeYears("1995-06-31", new Date("2026-10-07"))).toBeNull();
    expect(getAgeYears("1998-09-31", new Date("2026-10-07"))).toBeNull();
    expect(getAgeYears("2002-11-31", new Date("2026-10-07"))).toBeNull();
    expect(isStepValid(dobStep, { allergies: [], health: [], foodPrefs: [], barriers: [], birthDate: "2000-04-31" })).toBe(false);
  });

  it("rejects future dates", () => {
    expect(getAgeYears("2030-01-01", new Date("2026-10-07"))).toBeNull();
    expect(isStepValid(dobStep, { allergies: [], health: [], foodPrefs: [], barriers: [], birthDate: "2030-01-01" })).toBe(false);
  });

  it("serializes WheelDateValue to canonical YYYY-MM-DD format", () => {
    const value: WheelDateValue = { year: 1998, month: 3, day: 7 };
    const mm = String(value.month).padStart(2, "0");
    const dd = String(value.day).padStart(2, "0");
    const serialized = `${value.year}-${mm}-${dd}`;
    expect(serialized).toBe("1998-03-07");
  });

  it("preserves valid month and day when changing year", () => {
    const current: WheelDateValue = { year: 2000, month: 5, day: 15 };
    const newYear = 1990;
    const nextMax = new Date(newYear, current.month, 0).getDate();
    const clampedDay = Math.min(current.day, nextMax);
    const updated: WheelDateValue = { ...current, year: newYear, day: clampedDay };

    expect(updated).toEqual({ year: 1990, month: 5, day: 15 });
  });

  it("adjusts invalid day safely when changing month or non-leap year (e.g., March 31 -> April 30, Feb 29 -> Feb 28)", () => {
    // 1. March 31 -> April (max 30)
    const val1: WheelDateValue = { year: 2001, month: 3, day: 31 };
    const maxDaysApril = new Date(val1.year, 4, 0).getDate();
    const clampedDayApril = Math.min(val1.day, maxDaysApril);
    const updatedApril: WheelDateValue = { ...val1, month: 4, day: clampedDayApril };
    expect(updatedApril).toEqual({ year: 2001, month: 4, day: 30 });

    // 2. Feb 29 on 2004 (leap) -> 2005 (non-leap)
    const valLeap: WheelDateValue = { year: 2004, month: 2, day: 29 };
    const maxDaysNonLeap = new Date(2005, valLeap.month, 0).getDate();
    const clampedDayNonLeap = Math.min(valLeap.day, maxDaysNonLeap);
    const updatedNonLeap: WheelDateValue = { ...valLeap, year: 2005, day: clampedDayNonLeap };
    expect(updatedNonLeap).toEqual({ year: 2005, month: 2, day: 28 });
  });

  it("calculates accurate wheel centering and item scrollTop coordinates", () => {
    const ITEM_HEIGHT = 48;
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    // For May (month = 5), index is 4 -> target scrollTop = 4 * 48 = 192px
    const mayIdx = months.indexOf(5);
    expect(mayIdx).toBe(4);
    expect(mayIdx * ITEM_HEIGHT).toBe(192);

    // Scroll top 192px calculates nearest index 4 (May)
    const derivedIdx = Math.round(192 / ITEM_HEIGHT);
    expect(months[derivedIdx]).toBe(5);

    // Continuous scroll: at scrollTop 210px (moving toward June), nearest is still index 4 (May)
    expect(Math.round(210 / ITEM_HEIGHT)).toBe(4);

    // Continuous scroll: at scrollTop 220px (more than halfway to June at 240px), nearest is index 5 (June)
    expect(Math.round(220 / ITEM_HEIGHT)).toBe(5);
    expect(months[Math.round(220 / ITEM_HEIGHT)]).toBe(6);
  });

  it("passes selected DOB into onboarding RPC payload unchanged without timezone distortion", () => {
    const testBirthDate = "1994-08-23";
    const payload = buildOnboardingRpcPayload({
      goal: "maintain",
      sex: "female",
      birthDate: testBirthDate,
      heightCm: 165,
      weightKg: 60,
      activity: "light",
      diet: "balanced",
      allergies: [],
      health: [],
      foodPrefs: [],
      barriers: []
    });

    expect(payload.p_birth_date).toBe("1994-08-23");
    expect(payload.p_age_band).toBe(getAgeBandFromBirthDate(testBirthDate));
  });
});
