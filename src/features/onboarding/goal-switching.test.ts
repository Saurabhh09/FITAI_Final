import { describe, expect, it } from "vitest";
import {
  setSingleAnswer as webSetSingleAnswer,
  isStepValid as webIsStepValid,
  getVisibleFlow as webGetVisibleFlow,
  questionnaireFlow as webFlow,
  type QuestionnaireAnswers as WebAnswers,
  type QuestionnaireStep as WebStep
} from "./questionnaire";
import {
  setSingleAnswer as mobileSetSingleAnswer,
  isStepValid as mobileIsStepValid,
  getVisibleFlow as mobileGetVisibleFlow,
  questionnaireFlow as mobileFlow,
  type QuestionnaireAnswers as MobileAnswers,
  type QuestionnaireStep as MobileStep
} from "../../../apps/mobile/src/features/onboarding/questionnaire";
import { buildOnboardingRpcPayload } from "./onboarding-payload";

describe("Goal Switching - Removal of Automatic Target Weight Invention", () => {
  const baseAnswers: WebAnswers = {
    allergies: [],
    health: [],
    foodPrefs: [],
    barriers: [],
    birthDate: "1995-03-20",
    sex: "female",
    heightCm: 168,
    weightKg: 65,
    activity: "light",
    workouts: "3-5"
  };

  const implementations = [
    {
      platform: "Web",
      setSingleAnswer: webSetSingleAnswer,
      isStepValid: webIsStepValid,
      getVisibleFlow: webGetVisibleFlow,
      flow: webFlow
    },
    {
      platform: "Mobile",
      setSingleAnswer: mobileSetSingleAnswer,
      isStepValid: mobileIsStepValid,
      getVisibleFlow: mobileGetVisibleFlow,
      flow: mobileFlow
    }
  ] as const;

  implementations.forEach(({ platform, setSingleAnswer, isStepValid, getVisibleFlow, flow }) => {
    describe(`${platform} Platform`, () => {
      const goalWeightStep = flow.find((s) => s.id === "goal-weight")!;
      const paceStep = flow.find((s) => s.id === "pace")!;

      it("1. Maintain -> Lose: targetWeight and pace remain unset", () => {
        const initial: WebAnswers = { ...baseAnswers, goal: "maintain" };
        const switched = setSingleAnswer(initial, "goal", "lose");

        expect(switched.goal).toBe("lose");
        expect(switched.goalWeightKg).toBeUndefined();
        expect(switched.paceKgPerWeek).toBeUndefined();
      });

      it("2. Maintain -> Gain: targetWeight and pace remain unset", () => {
        const initial: WebAnswers = { ...baseAnswers, goal: "maintain" };
        const switched = setSingleAnswer(initial, "goal", "gain");

        expect(switched.goal).toBe("gain");
        expect(switched.goalWeightKg).toBeUndefined();
        expect(switched.paceKgPerWeek).toBeUndefined();
      });

      it("3. Lose -> Maintain: targetWeight and pace are cleared", () => {
        const initial: WebAnswers = {
          ...baseAnswers,
          goal: "lose",
          goalWeightKg: 60,
          paceKgPerWeek: 0.4
        };
        const switched = setSingleAnswer(initial, "goal", "maintain");

        expect(switched.goal).toBe("maintain");
        expect(switched.goalWeightKg).toBeUndefined();
        expect(switched.paceKgPerWeek).toBeUndefined();
      });

      it("4. Gain -> Maintain: targetWeight and pace are cleared", () => {
        const initial: WebAnswers = {
          ...baseAnswers,
          goal: "gain",
          goalWeightKg: 70,
          paceKgPerWeek: 0.25
        };
        const switched = setSingleAnswer(initial, "goal", "maintain");

        expect(switched.goal).toBe("maintain");
        expect(switched.goalWeightKg).toBeUndefined();
        expect(switched.paceKgPerWeek).toBeUndefined();
      });

      it("5. Lose -> Gain: old loss target/pace do not leak into gain", () => {
        const initial: WebAnswers = {
          ...baseAnswers,
          goal: "lose",
          goalWeightKg: 58,
          paceKgPerWeek: 0.5
        };
        const switched = setSingleAnswer(initial, "goal", "gain");

        expect(switched.goal).toBe("gain");
        expect(switched.goalWeightKg).toBeUndefined();
        expect(switched.paceKgPerWeek).toBeUndefined();
      });

      it("6. Gain -> Lose: old gain target/pace do not leak into loss", () => {
        const initial: WebAnswers = {
          ...baseAnswers,
          goal: "gain",
          goalWeightKg: 75,
          paceKgPerWeek: 0.35
        };
        const switched = setSingleAnswer(initial, "goal", "lose");

        expect(switched.goal).toBe("lose");
        expect(switched.goalWeightKg).toBeUndefined();
        expect(switched.paceKgPerWeek).toBeUndefined();
      });

      it("7. Lose requires explicit target weight (isStepValid is false until provided)", () => {
        const switched = setSingleAnswer({ ...baseAnswers, goal: "maintain" }, "goal", "lose");
        expect(isStepValid(goalWeightStep, switched)).toBe(false);

        const withExplicitTarget = { ...switched, goalWeightKg: 60 };
        expect(isStepValid(goalWeightStep, withExplicitTarget)).toBe(true);
      });

      it("8. Lose requires explicit pace (isStepValid is false until provided)", () => {
        const switched = setSingleAnswer({ ...baseAnswers, goal: "maintain" }, "goal", "lose");
        expect(isStepValid(paceStep, switched)).toBe(false);

        const withExplicitPace = { ...switched, paceKgPerWeek: 0.25 };
        expect(isStepValid(paceStep, withExplicitPace)).toBe(true);
      });

      it("9. Gain requires explicit target weight (isStepValid is false until provided)", () => {
        const switched = setSingleAnswer({ ...baseAnswers, goal: "maintain" }, "goal", "gain");
        expect(isStepValid(goalWeightStep, switched)).toBe(false);

        const withExplicitTarget = { ...switched, goalWeightKg: 70 };
        expect(isStepValid(goalWeightStep, withExplicitTarget)).toBe(true);
      });

      it("10. Gain requires explicit pace (isStepValid is false until provided)", () => {
        const switched = setSingleAnswer({ ...baseAnswers, goal: "maintain" }, "goal", "gain");
        expect(isStepValid(paceStep, switched)).toBe(false);

        const withExplicitPace = { ...switched, paceKgPerWeek: 0.25 };
        expect(isStepValid(paceStep, withExplicitPace)).toBe(true);
      });

      it("11. Maintain does not require target weight or pace in visible flow", () => {
        const maintainAnswers: WebAnswers = { ...baseAnswers, goal: "maintain" };
        const visibleFlow = getVisibleFlow(maintainAnswers);

        expect(visibleFlow.some((step) => step.id === "goal-weight")).toBe(false);
        expect(visibleFlow.some((step) => step.id === "weight-insight")).toBe(false);
        expect(visibleFlow.some((step) => step.id === "pace")).toBe(false);
      });

      it("12. No code path automatically calculates currentWeight - 5 or currentWeight + 5", () => {
        const withCurrentWeight: WebAnswers = { ...baseAnswers, weightKg: 80, goal: "maintain" };

        const toLose = setSingleAnswer(withCurrentWeight, "goal", "lose");
        expect(toLose.goalWeightKg).not.toBe(75);
        expect(toLose.goalWeightKg).toBeUndefined();

        const toGain = setSingleAnswer(withCurrentWeight, "goal", "gain");
        expect(toGain.goalWeightKg).not.toBe(85);
        expect(toGain.goalWeightKg).toBeUndefined();
      });
    });
  });

  describe("Preserve Minor Safety", () => {
    it("minor + lose_weight still cannot produce a weight-loss plan", () => {
      const minorLoseAnswers: WebAnswers = {
        ...baseAnswers,
        birthDate: "2010-06-15", // ~16 years old (minor)
        goal: "lose",
        goalWeightKg: 60,
        paceKgPerWeek: 0.25
      };

      expect(() => buildOnboardingRpcPayload(minorLoseAnswers)).toThrow(
        "Weight-loss plans are not available for minors or unconfirmed age."
      );
    });
  });
});
