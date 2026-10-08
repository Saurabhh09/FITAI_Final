export type Goal = "lose" | "maintain" | "gain";
export type Sex = "male" | "female" | "other";
export type Activity = "sedentary" | "light" | "moderate" | "very";
export type WorkoutFrequency = "0-2" | "3-5" | "6+";
export type DietStyle = "balanced" | "vegetarian" | "vegan" | "pescatarian" | "mediterranean" | "high-protein";
export type MealFrequency = "2" | "3" | "4" | "5";
export type Reminder = "none" | "meal" | "evening";
export type Rollover = "no" | "yes";

export type QuestionnaireAnswers = {
  goal?: Goal;
  birthDate?: string;
  sex?: Sex;
  heightCm?: number;
  weightKg?: number;
  activity?: Activity;
  workouts?: WorkoutFrequency;
  goalWeightKg?: number;
  paceKgPerWeek?: number;
  diet?: DietStyle;
  allergies?: string[];
  health?: string[];
  mealsPerDay?: MealFrequency;
  foodPrefs?: string[];
  barriers?: string[];
  reminders?: Reminder;
  rollover?: Rollover;
};

export type QuestionnaireStepId =
  | "goal" | "goal-insight" | "dob" | "sex" | "height" | "weight"
  | "activity" | "workouts" | "goal-weight" | "weight-insight" | "pace" | "diet"
  | "allergies" | "health" | "meals" | "food-prefs" | "barriers"
  | "support-insight" | "reminders" | "rollover"
  | "plan-social-proof" | "plan-recommendation" | "plan-strategy" | "plan-authority";

export type QuestionOption = Readonly<{
  value: string;
  title: string;
  description?: string;
  icon: string;
  recommended?: boolean;
}>;

export type QuestionnaireStep = Readonly<{
  id: QuestionnaireStepId;
  type:
    | "single"
    | "multi"
    | "date"
    | "height"
    | "weight"
    | "goal-weight"
    | "pace"
    | "insight"
    | "plan-social-proof"
    | "plan-recommendation"
    | "plan-strategy"
    | "plan-authority";
  key?: keyof QuestionnaireAnswers;
  title: string;
  subtitle: string;
  options?: readonly QuestionOption[];
  grid?: boolean;
  optional?: boolean;
  noneValue?: string;
}>;

export const singleOptions = {
  goal: [
    { value: "lose", title: "Lose weight", description: "Build a steady, sustainable calorie deficit.", icon: "arrowDown" },
    { value: "maintain", title: "Maintain my weight", description: "Support a balanced routine and feel your best.", icon: "minus" },
    { value: "gain", title: "Gain weight", description: "Fuel gradual, intentional weight gain.", icon: "arrowUp" }
  ],
  sex: [
    { value: "male", title: "Male", icon: "male" },
    { value: "female", title: "Female", icon: "female" },
    { value: "other", title: "Another / prefer not to say", description: "We’ll use a neutral estimate.", icon: "person" }
  ],
  activity: [
    { value: "sedentary", title: "Mostly sitting", description: "Desk work, driving, or little daily walking.", icon: "person" },
    { value: "light", title: "Lightly active", description: "Regular walking or time on your feet.", icon: "walk" },
    { value: "moderate", title: "Moderately active", description: "A mix of movement and sitting most days.", icon: "activity" },
    { value: "very", title: "Very active", description: "Physical work or lots of movement most days.", icon: "bolt" }
  ],
  workouts: [
    { value: "0-2", title: "0–2 workouts", description: "A few days a week or less.", icon: "clock" },
    { value: "3-5", title: "3–5 workouts", description: "A few workouts most weeks.", icon: "dumbbell" },
    { value: "6+", title: "6+ workouts", description: "Training is part of most days.", icon: "activity" }
  ],
  diet: [
    { value: "balanced", title: "Balanced", description: "A flexible mix of foods.", icon: "plate" },
    { value: "vegetarian", title: "Vegetarian", description: "No meat or fish.", icon: "leaf" },
    { value: "vegan", title: "Vegan", description: "Plant-based foods only.", icon: "sprout" },
    { value: "pescatarian", title: "Pescatarian", description: "Fish, dairy, and plant foods.", icon: "fish" },
    { value: "mediterranean", title: "Mediterranean", description: "Plants, whole grains, and healthy fats.", icon: "olive" },
    { value: "high-protein", title: "Higher protein", description: "Protein-forward, still flexible.", icon: "drumstick" }
  ],
  mealsPerDay: [
    { value: "2", title: "2 meals", description: "A simple, lighter meal rhythm.", icon: "plate" },
    { value: "3", title: "3 meals", description: "Breakfast, lunch, and dinner.", icon: "fork" },
    { value: "4", title: "4 meals", description: "Three meals and a snack.", icon: "clock" },
    { value: "5", title: "5+ meals", description: "Smaller meals across the day.", icon: "sparkles" }
  ],
  motivation: [
    { value: "energy", title: "Feel more energized", icon: "bolt" },
    { value: "confidence", title: "Feel more confident", icon: "heart" },
    { value: "strength", title: "Build strength and fitness", icon: "dumbbell" },
    { value: "consistency", title: "Feel consistent and in control", icon: "target" }
  ],
  reminders: [
    { value: "none", title: "No reminders for now", description: "You can change this any time.", icon: "bell" },
    { value: "meal", title: "Gentle meal-time nudges", description: "A little help remembering to log.", icon: "clock" },
    { value: "evening", title: "An evening check-in", description: "A quick look at how the day went.", icon: "moon" }
  ],
  rollover: [
    { value: "no", title: "No, keep days separate", description: "A fresh daily target each day.", icon: "calendar" },
    { value: "yes", title: "Yes, up to 200 calories", description: "Add a little flexibility to tomorrow’s tracker.", icon: "refresh" }
  ]
} as const satisfies Record<string, readonly QuestionOption[]>;

export const multiOptions = {
  allergies: [
    { value: "none", title: "None", icon: "check" },
    { value: "dairy", title: "Dairy", icon: "check" },
    { value: "gluten", title: "Gluten", icon: "check" },
    { value: "peanuts", title: "Peanuts", icon: "check" },
    { value: "tree-nuts", title: "Tree nuts", icon: "check" },
    { value: "soy", title: "Soy", icon: "check" },
    { value: "eggs", title: "Eggs", icon: "check" },
    { value: "shellfish", title: "Shellfish", icon: "check" }
  ],
  health: [
    { value: "none", title: "No specific considerations", icon: "check" },
    { value: "health-condition", title: "Managing a health condition", icon: "check" },
    { value: "pregnancy", title: "Pregnant or breastfeeding", icon: "check" },
    { value: "history", title: "A history of disordered eating", icon: "check" },
    { value: "prefer-not", title: "Prefer not to say", icon: "check" }
  ],
  foodPrefs: [
    { value: "quick", title: "Quick to prepare", icon: "clock" },
    { value: "home-cooked", title: "Mostly home-cooked", icon: "fork" },
    { value: "indian", title: "Indian-inspired", icon: "plate" },
    { value: "plant-forward", title: "Plant-forward", icon: "leaf" },
    { value: "high-protein", title: "High-protein ideas", icon: "drumstick" },
    { value: "meal-prep", title: "Meal-prep friendly", icon: "calendar" },
    { value: "family", title: "Family-friendly meals", icon: "users" },
    { value: "simple", title: "Simple ingredients", icon: "sparkles" }
  ],
  barriers: [
    { value: "busy", title: "Busy schedule", icon: "calendar" },
    { value: "consistency", title: "Staying consistent", icon: "chart" },
    { value: "inspiration", title: "Meal inspiration", icon: "sparkles" },
    { value: "portions", title: "Portion sizes", icon: "plate" },
    { value: "eating-out", title: "Eating out often", icon: "fork" },
    { value: "snacking", title: "Stress or snacking", icon: "heart" },
    { value: "forgetting", title: "Remembering to log", icon: "clock" }
  ]
} as const satisfies Record<string, readonly QuestionOption[]>;

export const questionnaireFlow: readonly QuestionnaireStep[] = [
  { id: "goal", type: "single", key: "goal", title: "What would you like to accomplish?", subtitle: "Your goal helps FITAI shape a starting plan that feels relevant to you.", options: singleOptions.goal },
  { id: "goal-insight", type: "insight", title: "A clear goal. A plan that fits.", subtitle: "We’ll use your answers to build a starting point—not a one-size-fits-all rule." },
  { id: "dob", type: "date", key: "birthDate", title: "When were you born?", subtitle: "Your age helps estimate daily energy needs. This will be taken into account when calculating your daily nutrition goals." },
  { id: "sex", type: "single", key: "sex", title: "Choose your sex", subtitle: "This helps to personalize your experience.", options: singleOptions.sex },
  { id: "height", type: "height", key: "heightCm", title: "How tall are you?", subtitle: "A quick measurement helps us personalize your baseline." },
  { id: "weight", type: "weight", key: "weightKg", title: "What is your current weight?", subtitle: "This is used to estimate your starting nutrition targets." },
  { id: "activity", type: "single", key: "activity", title: "How active are you on a typical day?", subtitle: "Think about your usual movement outside of planned workouts.", options: singleOptions.activity },
  { id: "workouts", type: "single", key: "workouts", title: "How many workouts do you do per week?", subtitle: "This helps FITAI tailor activity tips around your routine.", options: singleOptions.workouts },
  { id: "goal-weight", type: "goal-weight", key: "goalWeightKg", title: "What weight would you like to reach?", subtitle: "Choose a direction that feels meaningful. Your target can be edited later." },
  { id: "weight-insight", type: "insight", title: "A realistic target for you", subtitle: "90% of users say that the change is obvious after using Fit AI and it is not easy to rebound." },
  { id: "pace", type: "pace", key: "paceKgPerWeek", title: "What pace feels realistic?", subtitle: "A gradual pace is easier to review and adjust as you go." },
  { id: "diet", type: "single", key: "diet", title: "Do you follow a specific eating style?", subtitle: "We’ll use this to keep food ideas closer to what you enjoy.", options: singleOptions.diet, grid: true },
  { id: "allergies", type: "multi", key: "allergies", title: "Any food allergies or intolerances?", subtitle: "Choose all that apply. Always verify product labels, especially for severe allergies.", options: multiOptions.allergies, noneValue: "none" },
  { id: "health", type: "multi", key: "health", title: "Anything we should keep in mind?", subtitle: "Optional context only. FITAI is a general wellness tool, not a medical dietitian.", options: multiOptions.health, noneValue: "none", optional: true },
  { id: "meals", type: "single", key: "mealsPerDay", title: "How many meals work for your day?", subtitle: "There’s no ideal number—choose what fits your normal rhythm.", options: singleOptions.mealsPerDay, grid: true },
  { id: "food-prefs", type: "multi", key: "foodPrefs", title: "What kind of food ideas would help?", subtitle: "Pick any preferences that make eating well feel more practical.", options: multiOptions.foodPrefs },
  { id: "barriers", type: "multi", key: "barriers", title: "What tends to get in the way?", subtitle: "This helps FITAI make its tips useful for your real routine.", options: multiOptions.barriers, grid: true },
  { id: "support-insight", type: "insight", title: "Built for your real life", subtitle: "Your plan can adapt to your habits, food preferences, and the things that make tracking harder." },
  { id: "reminders", type: "single", key: "reminders", title: "Would a gentle reminder help?", subtitle: "Choose a style—or skip reminders entirely. You can change it any time.", options: singleOptions.reminders },
  { id: "rollover", type: "single", key: "rollover", title: "Carry a few unused calories into tomorrow?", subtitle: "This optional tracker setting can roll over up to 200 calories from a logged day. It never changes your base nutrition plan.", options: singleOptions.rollover },
  { id: "plan-social-proof", type: "plan-social-proof", title: "Join over 10 million people like you", subtitle: "Real people achieving sustainable results with Fit AI." },
  { id: "plan-recommendation", type: "plan-recommendation", title: "Your daily recommendation", subtitle: "You can edit this anytime" },
  { id: "plan-strategy", type: "plan-strategy", title: "How to reach your goals", subtitle: "Simple daily habits designed to fit your real routine." },
  { id: "plan-authority", type: "plan-authority", title: "Trusted by millions", subtitle: "Clear daily guidance without rigid dieting rules." }
];

export function getAgeYears(birthDate?: string, now = new Date()): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) age -= 1;
  return age >= 0 ? age : null;
}

export function getVisibleFlow(answers: QuestionnaireAnswers): QuestionnaireStep[] {
  return questionnaireFlow.filter((step) => {
    if ((step.id === "goal-weight" || step.id === "weight-insight" || step.id === "pace") && (answers.goal !== "lose" && answers.goal !== "gain")) return false;
    return true;
  });
}

export function isStepValid(step: QuestionnaireStep, answers: QuestionnaireAnswers): boolean {
  if (
    step.type === "insight" ||
    step.type === "plan-social-proof" ||
    step.type === "plan-recommendation" ||
    step.type === "plan-strategy" ||
    step.type === "plan-authority" ||
    step.optional
  ) return true;
  if (!step.key) return true;
  const value = answers[step.key];
  if (step.type === "date") return getAgeYears(answers.birthDate) !== null;
  if (step.type === "height" || step.type === "weight" || step.type === "goal-weight") return typeof value === "number" && Number.isFinite(value);
  if (step.type === "pace") return typeof value === "number" && value > 0;
  if (step.type === "multi") return Array.isArray(value) && value.length > 0;
  return typeof value === "string" && value.length > 0;
}

export function toggleMultiAnswer(current: readonly string[], value: string, exclusiveValues: readonly string[] = []): string[] {
  if (exclusiveValues.includes(value)) return current.includes(value) ? [] : [value];
  const withoutExclusive = current.filter((entry) => !exclusiveValues.includes(entry));
  return withoutExclusive.includes(value)
    ? withoutExclusive.filter((entry) => entry !== value)
    : [...withoutExclusive, value];
}

export function setSingleAnswer(
  answers: QuestionnaireAnswers,
  id: QuestionnaireStepId,
  value: string
): QuestionnaireAnswers {
  switch (id) {
    case "goal":
      if (value === "lose" || value === "maintain" || value === "gain") {
        if (value === answers.goal) return answers;
        const next: QuestionnaireAnswers = { ...answers, goal: value };
        delete next.goalWeightKg;
        delete next.paceKgPerWeek;
        return next;
      }
      return answers;
    case "sex":
      if (value === "male" || value === "female" || value === "other") return { ...answers, sex: value };
      return answers;
    case "activity":
      if (value === "sedentary" || value === "light" || value === "moderate" || value === "very") return { ...answers, activity: value };
      return answers;
    case "workouts":
      if (value === "0-2" || value === "3-5" || value === "6+") return { ...answers, workouts: value };
      return answers;
    case "diet":
      if (value === "balanced" || value === "vegetarian" || value === "vegan" || value === "pescatarian" || value === "mediterranean" || value === "high-protein") return { ...answers, diet: value };
      return answers;
    case "meals":
      if (value === "2" || value === "3" || value === "4" || value === "5") return { ...answers, mealsPerDay: value };
      return answers;
    case "reminders":
      if (value === "none" || value === "meal" || value === "evening") return { ...answers, reminders: value };
      return answers;
    case "rollover":
      if (value === "no" || value === "yes") return { ...answers, rollover: value };
      return answers;
    case "pace": {
      const pace = Number(value);
      const allowed = answers.goal === "gain" ? [0.15, 0.25, 0.35] : [0.25, 0.4, 0.5];
      if (Number.isFinite(pace) && allowed.includes(pace)) return { ...answers, paceKgPerWeek: pace };
      return answers;
    }
    default: return answers;
  }
}

export function createInitialAnswers(): QuestionnaireAnswers {
  return { allergies: [], health: [], foodPrefs: [], barriers: [] };
}

