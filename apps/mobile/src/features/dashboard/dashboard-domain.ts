export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snacks";

export type LoggedMealItem = {
  id: string;
  name: string;
  serving: string;
  weightGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  mealType: MealType;
};

export type LoggedMealBucket = {
  mealType: MealType;
  items: LoggedMealItem[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
};

export type ConsumedTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export type DashboardNutritionProfile = {
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
  targetFiberGrams: number;
  targetWaterMl: number;
  calorieRollover: boolean;
  goal: string;
  weightKg: number;
  targetWeightKg: number | null;
  heightCm?: number | null;
  displayName: string;
};

export type DayRingStatus = "on_target" | "yellow" | "red" | "dotted" | "future";

export type DayCalorieSummary = {
  date: string;
  calories: number;
  targetCalories: number;
  hasMeals: boolean;
  status: DayRingStatus;
};

export type UserStreakData = {
  currentStreak: number;
  longestStreak: number;
  totalMealsLogged: number;
  totalDaysLogged: number;
  loggedDates: string[];
};

export const CORE_NUTRIENT_IDS = {
  CALORIES: "1008",
  PROTEIN: "1003",
  CARBS: "1005",
  FAT: "1004",
  FIBER: "1079",
} as const;

/**
 * Returns today's calendar date in local timezone as YYYY-MM-DD.
 */
export function todayISO(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function dateFromISO(s: string): Date {
  return new Date(`${s}T12:00:00`);
}

export function dateKey(d: Date): string {
  const copy = new Date(d);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}

export function getYesterdayISO(isoDate: string): string {
  const d = dateFromISO(isoDate);
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

export function getTomorrowISO(isoDate: string): string {
  const d = dateFromISO(isoDate);
  d.setDate(d.getDate() + 1);
  return dateKey(d);
}

export function formatDisplayDate(isoDate: string): string {
  const today = todayISO();
  const yesterday = getYesterdayISO(today);
  const tomorrow = getTomorrowISO(today);

  if (isoDate === today) return "Today";
  if (isoDate === yesterday) return "Yesterday";
  if (isoDate === tomorrow) return "Tomorrow";

  const [year, month, day] = isoDate.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  return dateObj.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Computes calorie rollover based on Priority 3A rules:
 * - Rollover disabled -> 0
 * - No meals logged yesterday -> 0 (explicit product rule)
 * - Yesterday under target -> min(200, unused calories)
 * - Yesterday over target -> 0 (never negative)
 * - Underlying base target remains unchanged
 */
export function computeRolloverKcal(
  targetCalories: number,
  calorieRolloverEnabled: boolean,
  yesterdayMeals: Array<{ calories: number }>
): number {
  if (!calorieRolloverEnabled) return 0;
  if (yesterdayMeals.length === 0) return 0;

  const yesterdayConsumed = yesterdayMeals.reduce((sum, item) => sum + item.calories, 0);
  const unused = targetCalories - yesterdayConsumed;
  if (unused <= 0) return 0;

  return Math.min(200, Math.round(unused));
}

/**
 * Aggregates daily nutrition totals from actual logged meal items.
 */
export function calculateDailyNutritionTotals(
  mealItems: Array<{ calories: number; protein: number; carbs: number; fat: number; fiber?: number }>
): ConsumedTotals {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber = 0;

  for (const item of mealItems) {
    calories += item.calories;
    protein += item.protein;
    carbs += item.carbs;
    fat += item.fat;
    fiber += item.fiber ?? 0;
  }

  return {
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    fiber: Math.round(fiber * 10) / 10,
  };
}

export function mapDbMealType(m: string): MealType {
  const lower = m.toLowerCase().trim();
  if (lower === "breakfast") return "Breakfast";
  if (lower === "lunch") return "Lunch";
  if (lower === "dinner") return "Dinner";
  return "Snacks";
}

export const ALL_MEAL_TYPES: readonly MealType[] = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;

/**
 * Organizes a flat list of meal items into structured buckets by meal type.
 */
export function groupMealItemsIntoBuckets(items: LoggedMealItem[]): LoggedMealBucket[] {
  return ALL_MEAL_TYPES.map((type) => {
    const bucketItems = items.filter((item) => item.mealType === type);
    return {
      mealType: type,
      items: bucketItems,
      totals: calculateDailyNutritionTotals(bucketItems),
    };
  });
}

/**
 * Returns an array of YYYY-MM-DD dates centered around centerDate.
 */
export function getDatesInStrip(centerDate: string, rangeBefore: number = 3, rangeAfter: number = 3): string[] {
  const current = dateFromISO(centerDate);
  const result: string[] = [];
  for (let offset = -rangeBefore; offset <= rangeAfter; offset++) {
    const d = new Date(current);
    d.setDate(d.getDate() + offset);
    result.push(dateKey(d));
  }
  return result;
}

/**
 * Calculates user's active day streak and all-time longest streak from logged dates.
 * An active streak requires logging today or yesterday.
 */
export function calculateUserStreak(
  loggedDates: string[],
  today: string = todayISO()
): { currentStreak: number; longestStreak: number } {
  const dateSet = new Set(loggedDates);
  const yesterday = getYesterdayISO(today);

  let currentStreak = 0;
  let checkDate: string | null = null;

  if (dateSet.has(today)) {
    checkDate = today;
  } else if (dateSet.has(yesterday)) {
    checkDate = yesterday;
  }

  if (checkDate) {
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = getYesterdayISO(checkDate);
    }
  }

  // Calculate all-time longest streak
  const sortedDates = [...dateSet].sort();
  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate: string | null = null;

  for (const dStr of sortedDates) {
    if (!lastDate) {
      tempStreak = 1;
    } else {
      const expectedTomorrow = getTomorrowISO(lastDate);
      if (dStr === expectedTomorrow) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    lastDate = dStr;
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  return { currentStreak, longestStreak };
}

/**
 * Determines the calendar circle ring color/style for a given day:
 * - Green (on_target): Either all calories have been taken or less than 100 calories left (caloriesLeft <= 100)
 * - Yellow / Orange: Between 100 and 200 calories left (100 < caloriesLeft <= 200)
 * - Red: Above 200 calories left (caloriesLeft > 200)
 * - Dotted: No meals logged that day
 * - Future: Upcoming days in neutral grey
 */
export function getDayRingStatus(
  caloriesConsumed: number,
  targetCalories: number,
  hasMeals: boolean,
  isFuture: boolean
): DayRingStatus {
  if (isFuture) return "future";
  if (!hasMeals || caloriesConsumed <= 0) return "dotted";

  const caloriesLeft = targetCalories - caloriesConsumed;
  if (caloriesLeft <= 100) return "on_target";
  if (caloriesLeft <= 200) return "yellow";
  return "red";
}

