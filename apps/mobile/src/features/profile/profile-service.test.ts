import { describe, expect, it } from "vitest";
import {
  calculateAge,
  formatDateOfBirthDisplay,
} from "./profile-service";

describe("profile-service unit tests", () => {
  it("calculates age correctly from ISO birth date", () => {
    // 2008 birth date
    const age = calculateAge("2008-10-12");
    expect(age).toBeGreaterThanOrEqual(16);
    expect(age).toBeLessThanOrEqual(19);

    // Fallback on empty
    expect(calculateAge("")).toBe(20);
    expect(calculateAge(null)).toBe(20);
  });

  it("formats date of birth into DD/MM/YYYY", () => {
    expect(formatDateOfBirthDisplay("2008-12-10")).toBe("10/12/2008");
    expect(formatDateOfBirthDisplay("1995-05-24")).toBe("24/05/1995");
    expect(formatDateOfBirthDisplay("")).toBe("10/12/2008");
  });
});
