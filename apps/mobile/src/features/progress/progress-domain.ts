import { todayISO, dateFromISO, dateKey, getYesterdayISO } from "../dashboard/dashboard-domain";

export type WeightEntryItem = {
  id: string;
  weightKg: number;
  recordedAt: string; // ISO string
};

export type BMICategory = "underweight" | "healthy" | "overweight" | "obese";

export type BMIData = {
  bmi: number;
  category: BMICategory;
  categoryLabel: string;
  categoryColor: string;
  categoryBgColor: string;
  percentPosition: number; // 0 to 100 on the spectrum bar
};

export type DayMacroData = {
  dateISO: string;
  dayShort: string; // "Sun", "Mon", etc.
  dayLetter: string; // "S", "M", etc.
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  hasMeals: boolean;
};

export type WeekMacroSummary = {
  averageCalories: number;
  days: DayMacroData[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
};

export type WeeklyEnergySummary = {
  consumedCalories: number;
  burnedCalories: number;
  netCalories: number;
  dailyConsumed: number[];
  dailyBurned: number[];
  daysShort: string[];
};

export type ExpenditureRow = {
  label: string; // "3 day", "7 day", etc.
  avgKcal: number;
  trend: string; // "No change", "+45 Kcal", "-80 Kcal"
  trendType: "neutral" | "up" | "down";
};

export type WeightProgressData = {
  currentWeight: number;
  baselineWeight: number;
  targetWeight: number | null;
  percentOfGoal: number;
  changeKg: number;
  chartPoints: Array<{ date: string; weight: number }>;
  yTicks: number[];
  minWeight: number;
  maxWeight: number;
};

/**
 * Calculates BMI and category details.
 * Standard WHO cutoffs:
 * - < 18.5: Underweight
 * - 18.5 - 24.9: Healthy
 * - 25.0 - 29.9: Overweight
 * - >= 30.0: Obese
 */
export function calculateBMI(weightKg: number, heightCm: number): BMIData {
  const safeHeightCm = heightCm > 0 ? heightCm : 170;
  const safeWeightKg = weightKg > 0 ? weightKg : 60;
  const heightM = safeHeightCm / 100;
  const rawBMI = safeWeightKg / (heightM * heightM);
  const bmi = Math.round(rawBMI * 100) / 100;

  let category: BMICategory = "healthy";
  let categoryLabel = "Healthy";
  let categoryColor = "#16A34A";
  let categoryBgColor = "#DCFCE7";

  if (bmi < 18.5) {
    category = "underweight";
    categoryLabel = "Underweight";
    categoryColor = "#0284C7";
    categoryBgColor = "#E0F2FE";
  } else if (bmi <= 24.9) {
    category = "healthy";
    categoryLabel = "Healthy";
    categoryColor = "#16A34A";
    categoryBgColor = "#DCFCE7";
  } else if (bmi <= 29.9) {
    category = "overweight";
    categoryLabel = "Overweight";
    categoryColor = "#D97706";
    categoryBgColor = "#FEF3C7";
  } else {
    category = "obese";
    categoryLabel = "Obese";
    categoryColor = "#DC2626";
    categoryBgColor = "#FEE2E2";
  }

  // Calculate percentage along spectrum [14 to 35 BMI range for UI needle]
  const minRange = 14;
  const maxRange = 36;
  const percentPosition = Math.max(0, Math.min(100, Math.round(((bmi - minRange) / (maxRange - minRange)) * 100)));

  return {
    bmi,
    category,
    categoryLabel,
    categoryColor,
    categoryBgColor,
    percentPosition,
  };
}

/**
 * Computes progress percentage towards goal weight.
 */
export function calculateWeightGoalProgress(
  baselineWeight: number,
  currentWeight: number,
  targetWeight: number | null
): { percentOfGoal: number; changeKg: number } {
  const changeKg = Math.round((currentWeight - baselineWeight) * 10) / 10;
  if (!targetWeight || targetWeight === baselineWeight) {
    return { percentOfGoal: 100, changeKg };
  }

  const totalDistance = Math.abs(targetWeight - baselineWeight);
  const achievedDistance = Math.abs(currentWeight - baselineWeight);

  // If moving in opposite direction
  const isLoss = targetWeight < baselineWeight;
  const movedCorrectly = isLoss ? currentWeight <= baselineWeight : currentWeight >= baselineWeight;

  if (!movedCorrectly) {
    return { percentOfGoal: 0, changeKg };
  }

  const percent = Math.min(100, Math.max(0, Math.round((achievedDistance / totalDistance) * 100)));
  return { percentOfGoal: percent, changeKg };
}

/**
 * Generates 5 evenly spaced Y-axis ticks for weight chart.
 */
export function generateWeightTicks(min: number, max: number): number[] {
  if (min === max) {
    return [
      Math.round((min + 2) * 10) / 10,
      Math.round((min + 1) * 10) / 10,
      Math.round(min * 10) / 10,
      Math.round((min - 1) * 10) / 10,
      Math.round((min - 2) * 10) / 10,
    ];
  }
  const span = max - min;
  const step = span / 4;
  const ticks: number[] = [];
  for (let i = 4; i >= 0; i--) {
    ticks.push(Math.round((min + i * step) * 10) / 10);
  }
  return ticks;
}

/**
 * Filters weight records according to timeframe.
 */
export function filterWeightsByTimeframe(
  entries: WeightEntryItem[],
  timeframe: "90D" | "6M" | "1Y" | "ALL",
  today: string = todayISO()
): WeightEntryItem[] {
  if (timeframe === "ALL") return entries;

  const daysMap = { "90D": 90, "6M": 182, "1Y": 365 };
  const daysLimit = daysMap[timeframe] || 90;

  const cutoff = new Date(today + "T23:59:59Z");
  cutoff.setDate(cutoff.getDate() - daysLimit);
  const cutoffISO = cutoff.toISOString();

  return entries.filter((e) => e.recordedAt >= cutoffISO);
}

/**
 * Generates the 7 days (Sun through Sat) for a given week offset from today.
 * offset 0 = This wk (current calendar week)
 * offset 1 = Last wk
 * offset 2 = 2 wk ago
 * offset 3 = 3 wk ago
 */
export function getCalendarWeekDays(weekOffset: number = 0, today: string = todayISO()): string[] {
  const current = dateFromISO(today);
  const dayOfWeek = current.getDay(); // 0 = Sun, 1 = Mon ...
  const sunday = new Date(current);
  sunday.setDate(current.getDate() - dayOfWeek - weekOffset * 7);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    days.push(dateKey(d));
  }
  return days;
}

/**
 * Aggregates daily macros for a week.
 */
export function aggregateWeekMacros(
  weekDates: string[],
  dailyData: Record<string, { calories: number; protein: number; carbs: number; fat: number }>
): WeekMacroSummary {
  const DAY_SHORTS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let daysWithCalories = 0;

  const days: DayMacroData[] = weekDates.map((dStr, idx) => {
    const d = dateFromISO(dStr);
    const dayOfWeek = d.getDay();
    const entry = dailyData[dStr] || { calories: 0, protein: 0, carbs: 0, fat: 0 };

    totalCalories += entry.calories;
    totalProtein += entry.protein;
    totalCarbs += entry.carbs;
    totalFat += entry.fat;

    if (entry.calories > 0) {
      daysWithCalories++;
    }

    return {
      dateISO: dStr,
      dayShort: DAY_SHORTS[dayOfWeek] || DAY_SHORTS[idx],
      dayLetter: DAY_LETTERS[dayOfWeek] || DAY_LETTERS[idx],
      calories: Math.round(entry.calories),
      protein: Math.round(entry.protein),
      carbs: Math.round(entry.carbs),
      fat: Math.round(entry.fat),
      hasMeals: entry.calories > 0,
    };
  });

  const averageCalories = daysWithCalories > 0 ? Math.round(totalCalories / daysWithCalories) : 0;

  return {
    averageCalories,
    days,
    totalCalories: Math.round(totalCalories),
    totalProtein: Math.round(totalProtein),
    totalCarbs: Math.round(totalCarbs),
    totalFat: Math.round(totalFat),
  };
}

/**
 * Computes weekly energy consumed vs estimated expenditure (burn).
 */
export function calculateWeeklyEnergy(
  weekDays: DayMacroData[],
  dailyTargetCalories: number
): WeeklyEnergySummary {
  const consumedCalories = weekDays.reduce((sum, d) => sum + d.calories, 0);
  // Estimated daily burn is target calories (TDEE baseline)
  const burnedCalories = dailyTargetCalories * 7;
  const netCalories = consumedCalories - burnedCalories;

  const dailyConsumed = weekDays.map((d) => d.calories);
  const dailyBurned = weekDays.map(() => dailyTargetCalories);
  const daysShort = weekDays.map((d) => d.dayShort);

  return {
    consumedCalories,
    burnedCalories,
    netCalories,
    dailyConsumed,
    dailyBurned,
    daysShort,
  };
}

/**
 * Computes expenditure / intake changes across standard windows:
 * 3 day, 7 day, 14 day, 30 day, 90 day, all-time.
 */
export function calculateExpenditureChanges(
  dailyCalories: Record<string, number>,
  targetCalories: number,
  today: string = todayISO()
): ExpenditureRow[] {
  const windows = [
    { label: "3 day", days: 3 },
    { label: "7 day", days: 7 },
    { label: "14 day", days: 14 },
    { label: "30 day", days: 30 },
    { label: "90 day", days: 90 },
    { label: "All Time", days: 365 },
  ];

  const results: ExpenditureRow[] = [];
  const refDate = dateFromISO(today);

  for (const win of windows) {
    let sum = 0;
    let count = 0;

    for (let i = 0; i < win.days; i++) {
      const d = new Date(refDate);
      d.setDate(refDate.getDate() - i);
      const k = dateKey(d);
      if (k in dailyCalories && dailyCalories[k] > 0) {
        sum += dailyCalories[k];
        count++;
      }
    }

    if (count === 0) {
      results.push({
        label: win.label,
        avgKcal: 0,
        trend: "No change",
        trendType: "neutral",
      });
    } else {
      const avg = Math.round(sum / count);
      const diff = avg - targetCalories;
      let trend = "No change";
      let trendType: "neutral" | "up" | "down" = "neutral";

      if (Math.abs(diff) <= 25) {
        trend = "No change";
        trendType = "neutral";
      } else if (diff > 0) {
        trend = `+${diff} Kcal`;
        trendType = "up";
      } else {
        trend = `${diff} Kcal`;
        trendType = "down";
      }

      results.push({
        label: win.label,
        avgKcal: avg,
        trend,
        trendType,
      });
    }
  }

  return results;
}
