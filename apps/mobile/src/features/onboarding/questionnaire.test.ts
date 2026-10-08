import { describe, expect, it } from "vitest";
import {
  getAgeYears,
  getVisibleFlow,
  isStepValid,
  multiOptions,
  questionnaireFlow,
  singleOptions,
  toggleMultiAnswer,
  type QuestionnaireAnswers
} from "./questionnaire";

describe("original onboarding contract", () => {
  it("keeps all onboarding screens in the expected order", () => {
    expect(questionnaireFlow.map((step) => step.id)).toEqual([
      "goal", "goal-insight", "dob", "sex", "height", "weight", "activity",
      "workouts", "goal-weight", "weight-insight", "pace", "diet", "allergies", "health",
      "meals", "food-prefs", "barriers", "support-insight", "reminders", "rollover",
      "plan-social-proof", "plan-recommendation", "plan-strategy", "plan-authority"
    ]);
    expect(questionnaireFlow.map((step) => step.title)).toEqual([
      "What would you like to accomplish?",
      "A clear goal. A plan that fits.",
      "When were you born?",
      "Choose your sex",
      "How tall are you?",
      "What is your current weight?",
      "How active are you on a typical day?",
      "How many workouts do you do per week?",
      "What weight would you like to reach?",
      "A realistic target for you",
      "What pace feels realistic?",
      "Do you follow a specific eating style?",
      "Any food allergies or intolerances?",
      "Anything we should keep in mind?",
      "How many meals work for your day?",
      "What kind of food ideas would help?",
      "What tends to get in the way?",
      "Built for your real life",
      "Would a gentle reminder help?",
      "Carry a few unused calories into tomorrow?",
      "Join over 10 million people like you",
      "Your daily recommendation",
      "How to reach your goals",
      "Trusted by millions"
    ]);
  });

  it("preserves the source selectable option values", () => {
    expect(singleOptions.goal.map((option) => option.value)).toEqual(["lose", "maintain", "gain"]);
    expect(singleOptions.sex.map((option) => option.value)).toEqual(["male", "female", "other"]);
    expect(singleOptions.activity.map((option) => option.value)).toEqual(["sedentary", "light", "moderate", "very"]);
    expect(singleOptions.workouts.map((option) => option.value)).toEqual(["0-2", "3-5", "6+"]);
    expect(singleOptions.diet.map((option) => option.value)).toEqual([
      "balanced", "vegetarian", "vegan", "pescatarian", "mediterranean", "high-protein"
    ]);
    expect(singleOptions.mealsPerDay.map((option) => option.value)).toEqual(["2", "3", "4", "5"]);
    expect(singleOptions.reminders.map((option) => option.value)).toEqual(["none", "meal", "evening"]);
    expect(singleOptions.rollover.map((option) => option.value)).toEqual(["no", "yes"]);
    expect(multiOptions.allergies.map((option) => option.value)).toEqual([
      "none", "dairy", "gluten", "peanuts", "tree-nuts", "soy", "eggs", "shellfish"
    ]);
    expect(multiOptions.health.map((option) => option.value)).toEqual([
      "none", "health-condition", "pregnancy", "history", "prefer-not"
    ]);
    expect(multiOptions.foodPrefs.map((option) => option.value)).toEqual([
      "quick", "home-cooked", "indian", "plant-forward", "high-protein", "meal-prep", "family", "simple"
    ]);
    expect(multiOptions.barriers.map((option) => option.value)).toEqual([
      "busy", "consistency", "inspiration", "portions", "eating-out", "snacking", "forgetting"
    ]);
  });

  it("includes goal-weight, weight-insight, and pace only for weight-change goals", () => {
    const changeAnswers: QuestionnaireAnswers = {
      goal: "lose",
      birthDate: "1990-06-01"
    };
    const changeIds = getVisibleFlow(changeAnswers).map((step) => step.id);
    expect(changeIds).toHaveLength(24);
    expect(changeIds).toContain("goal-weight");
    expect(changeIds).toContain("weight-insight");
    expect(changeIds).toContain("pace");

    const maintainIds = getVisibleFlow({ ...changeAnswers, goal: "maintain" }).map((step) => step.id);
    expect(maintainIds).toHaveLength(21);
    expect(maintainIds).not.toContain("goal-weight");
    expect(maintainIds).not.toContain("weight-insight");
    expect(maintainIds).not.toContain("pace");
  });

  it("includes all baseline metric questions regardless of age", () => {
    const flowIds = getVisibleFlow({ goal: "lose", birthDate: "2012-06-01" }).map((step) => step.id);
    expect(flowIds).toContain("sex");
    expect(flowIds).toContain("height");
    expect(flowIds).toContain("weight");
    expect(flowIds).toContain("goal-weight");
    expect(flowIds).toContain("pace");
    expect(flowIds).toContain("diet");
    expect(flowIds).toContain("health");
  });

  it("rejects invalid, future, and underage dates consistently", () => {
    expect(getAgeYears("2000-02-29", new Date(2026, 1, 28))).toBe(25);
    expect(getAgeYears("2001-02-29")).toBeNull();
    expect(getAgeYears("2027-01-01")).toBeNull();
    expect(getAgeYears("2012-10-05", new Date(2026, 9, 4))).toBe(13);
  });

  it("keeps optional health context skippable and requires explicit allergy selection", () => {
    const health = questionnaireFlow.find((step) => step.id === "health");
    const allergies = questionnaireFlow.find((step) => step.id === "allergies");
    expect(health && isStepValid(health, {})).toBe(true);
    expect(allergies && isStepValid(allergies, {})).toBe(false);
    expect(allergies && isStepValid(allergies, { allergies: ["none"] })).toBe(true);
  });

  it("makes exclusive options mutually exclusive without changing other selections", () => {
    expect(toggleMultiAnswer(["dairy"], "none", ["none"])).toEqual(["none"]);
    expect(toggleMultiAnswer(["none"], "dairy", ["none"])).toEqual(["dairy"]);
    expect(toggleMultiAnswer(["dairy", "eggs"], "dairy", ["none"])).toEqual(["eggs"]);
    expect(toggleMultiAnswer(["pregnancy"], "prefer-not", ["none", "prefer-not"])).toEqual(["prefer-not"]);
  });
});
