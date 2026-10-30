import { describe, expect, it } from "vitest";
import { computeMilestoneBadges } from "./milestones-domain";

describe("Milestones Domain Logic", () => {
  it("initializes with 30 badges and evaluates initial locked state for new user", () => {
    const result = computeMilestoneBadges({
      currentStreak: 0,
      longestStreak: 0,
      totalMealsLogged: 0,
      totalDaysLogged: 0,
      waterMl: 0,
      weightKg: null,
    });

    expect(result.totalCount).toBe(30);
    expect(result.unlockedCount).toBe(0);
    expect(result.progressPercent).toBe(0);
  });

  it("unlocks streak and meal badges as user progresses", () => {
    const result = computeMilestoneBadges({
      currentStreak: 3,
      longestStreak: 3,
      totalMealsLogged: 6,
      totalDaysLogged: 3,
      waterMl: 1200,
      weightKg: 75,
    });

    const rookie = result.badges.find((b) => b.id === "rookie");
    expect(rookie?.isUnlocked).toBe(true);

    const firstBite = result.badges.find((b) => b.id === "first_bite");
    expect(firstBite?.isUnlocked).toBe(true);

    const highFive = result.badges.find((b) => b.id === "high_five");
    expect(highFive?.isUnlocked).toBe(true);

    const platePro = result.badges.find((b) => b.id === "plate_pro");
    expect(platePro?.isUnlocked).toBe(false);

    const hydration = result.badges.find((b) => b.id === "hydration_hero");
    expect(hydration?.isUnlocked).toBe(true);

    const weight = result.badges.find((b) => b.id === "scale_stepper");
    expect(weight?.isUnlocked).toBe(true);

    expect(result.unlockedCount).toBeGreaterThan(0);
  });
});
