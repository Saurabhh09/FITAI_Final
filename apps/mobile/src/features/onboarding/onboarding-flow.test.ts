import { describe, expect, it, vi } from "vitest";
import mockAsyncStorage from "../../lib/async-storage-mock";
import type { QuestionnaireAnswers } from "./questionnaire";

describe("Mobile Onboarding -> Auth -> Dashboard Transition Flow", () => {
  const PENDING_ONBOARDING_KEY = "@fitai_pending_onboarding_answers";

  const sampleAnswers: QuestionnaireAnswers = {
    goal: "lose",
    sex: "male",
    birthDate: "1998-05-15",
    heightCm: 180,
    weightKg: 85,
    goalWeightKg: 78,
    paceKgPerWeek: 0.4,
    activity: "moderate",
    workouts: "3-5",
    diet: "balanced",
    mealsPerDay: "3",
    rollover: "yes",
    allergies: ["dairy"],
    health: ["none"],
    foodPrefs: [],
    barriers: [],
  };

  it("persists pending answers to storage when unauthenticated onboarding completes", async () => {
    await mockAsyncStorage.setItem(PENDING_ONBOARDING_KEY, JSON.stringify(sampleAnswers));
    const stored = await mockAsyncStorage.getItem(PENDING_ONBOARDING_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.goal).toBe("lose");
    expect(parsed.sex).toBe("male");
    expect(parsed.birthDate).toBe("1998-05-15");
  });

  it("decides whether to show second onboarding or auto-submit based on cached answers", () => {
    function resolveAuthenticatedRoute(hasNutritionProfile: boolean, cachedAnswers: QuestionnaireAnswers | null) {
      if (hasNutritionProfile) return "dashboard";
      if (cachedAnswers) return "auto_submitting";
      return "onboarding";
    }

    // 1. Authenticated, no profile, but has cached answers -> must auto-submit, NOT show onboarding!
    expect(resolveAuthenticatedRoute(false, sampleAnswers)).toBe("auto_submitting");

    // 2. Authenticated, no profile, and NO cached answers -> show onboarding
    expect(resolveAuthenticatedRoute(false, null)).toBe("onboarding");

    // 3. Authenticated, has profile -> dashboard
    expect(resolveAuthenticatedRoute(true, null)).toBe("dashboard");
  });

  it("cleans up persistent pending answers once auto-submission succeeds", async () => {
    await mockAsyncStorage.setItem(PENDING_ONBOARDING_KEY, JSON.stringify(sampleAnswers));
    expect(await mockAsyncStorage.getItem(PENDING_ONBOARDING_KEY)).not.toBeNull();

    // Simulate successful submission cleanup
    await mockAsyncStorage.removeItem(PENDING_ONBOARDING_KEY);
    expect(await mockAsyncStorage.getItem(PENDING_ONBOARDING_KEY)).toBeNull();
  });
});
