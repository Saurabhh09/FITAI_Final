import { describe, expect, it } from "vitest";
import {
  cmToFtIn,
  cmToInches,
  flOzToMl,
  ftInToCm,
  inchesToCm,
  kgToLb,
  lbToKg,
  mlToFlOz,
  roundToDecimal
} from "../src/units";

describe("Unit Conversions & Precision", () => {
  it("converts kg to lb and lb to kg with accuracy", () => {
    expect(kgToLb(70)).toBe(154.3);
    expect(kgToLb(100)).toBe(220.5);
    expect(kgToLb(0)).toBe(0);
    expect(kgToLb(-10)).toBe(0);

    expect(lbToKg(154.32)).toBe(70);
    expect(lbToKg(220.46)).toBe(100);
  });

  it("converts cm to inches and inches to cm with accuracy", () => {
    expect(cmToInches(178)).toBe(70.1);
    expect(inchesToCm(70.0787)).toBe(178);
  });

  it("converts between cm and feet/inches reliably", () => {
    const ftIn = cmToFtIn(178); // 178 cm is ~70.08 inches -> 5 ft 10 in
    expect(ftIn.feet).toBe(5);
    expect(ftIn.inches).toBe(10);

    const backToCm = ftInToCm(5, 10);
    expect(backToCm).toBe(177.8);
  });

  it("converts ml to fl oz and back", () => {
    expect(mlToFlOz(2500)).toBe(84.5);
    expect(flOzToMl(84.535)).toBe(2500);
  });

  it("safely handles non-finite numbers", () => {
    expect(roundToDecimal(NaN)).toBe(0);
    expect(roundToDecimal(Infinity)).toBe(0);
    expect(kgToLb(NaN)).toBe(0);
    expect(lbToKg(Infinity)).toBe(0);
  });
});
