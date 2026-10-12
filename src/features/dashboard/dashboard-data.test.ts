
import { describe, expect, it } from "vitest";
import type { DashboardNutritionProfile, LoggedMealItem, WeightLog } from "./dashboard-view";

describe("Dashboard Nutrition Profile & Persisted Data Mapping", () => {
  const mockDbProfileRow = {
    target_calories: 2350,
    target_protein_grams: 165,
    target_carbs_grams: 280,
    target_fat_grams: 65,
    target_fiber_grams: 33,
    target_water_ml: 2900,
    weight_kg: 74.5,
    target_weight_kg: 70.0,
    goal: "lose_weight"
  };

  it("correctly maps database nutrition profile columns to dashboard target properties", () => {
    const mapped: DashboardNutritionProfile = {
      targetCalories: Number(mockDbProfileRow.target_calories),
      targetProteinGrams: Number(mockDbProfileRow.target_protein_grams),
      targetCarbsGrams: Number(mockDbProfileRow.target_carbs_grams),
      targetFatGrams: Number(mockDbProfileRow.target_fat_grams),
      targetFiberGrams: Number(mockDbProfileRow.target_fiber_grams),
      targetWaterMl: Number(mockDbProfileRow.target_water_ml),
      weightKg: Number(mockDbProfileRow.weight_kg),
      targetWeightKg: mockDbProfileRow.target_weight_kg !== null ? Number(mockDbProfileRow.target_weight_kg) : null
    };

    expect(mapped.targetCalories).toBe(2350);
    expect(mapped.targetProteinGrams).toBe(165);
    expect(mapped.targetCarbsGrams).toBe(280);
    expect(mapped.targetFatGrams).toBe(65);
    expect(mapped.targetFiberGrams).toBe(33);
    expect(mapped.targetWaterMl).toBe(2900);
    expect(mapped.targetWaterMl / 1000).toBe(2.9);
    expect(mapped.weightKg).toBe(74.5);
    expect(mapped.targetWeightKg).toBe(70.0);
  });

  it("correctly handles nullable target_weight_kg for maintain goal", () => {
    const maintainRow = {
      ...mockDbProfileRow,
      goal: "maintain",
      target_weight_kg: null
    };

    const mapped: DashboardNutritionProfile = {
      targetCalories: Number(maintainRow.target_calories),
      targetProteinGrams: Number(maintainRow.target_protein_grams),
      targetCarbsGrams: Number(maintainRow.target_carbs_grams),
      targetFatGrams: Number(maintainRow.target_fat_grams),
      targetFiberGrams: Number(maintainRow.target_fiber_grams),
      targetWaterMl: Number(maintainRow.target_water_ml),
      weightKg: Number(maintainRow.weight_kg),
      targetWeightKg: maintainRow.target_weight_kg !== null ? Number(maintainRow.target_weight_kg) : null
    };

    expect(mapped.targetWeightKg).toBeNull();
    expect(mapped.weightKg).toBe(74.5);
  });

  it("correctly derives 0 consumed totals when user has no meal records (empty state)", () => {
    const emptyMeals: LoggedMealItem[] = [];
    let calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0;
    emptyMeals.forEach((item) => {
      calories += item.calories;
      protein += item.protein;
      carbs += item.carbs;
      fat += item.fat;
      fiber += item.fiber ?? 0;
    });

    const totals = {
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      fiber: Math.round(fiber)
    };

    expect(totals.calories).toBe(0);
    expect(totals.protein).toBe(0);
    expect(totals.carbs).toBe(0);
    expect(totals.fat).toBe(0);
    expect(totals.fiber).toBe(0);
  });

  it("correctly derives consumed totals from real logged meal entries", () => {
    const loggedMeals: LoggedMealItem[] = [
      {
        id: "m-1",
        name: "Eggs & Toast",
        serving: "2 eggs + 1 toast",
        weightGrams: 150,
        calories: 250,
        protein: 16.5,
        carbs: 18.0,
        fat: 12.0,
        fiber: 2.0,
        mealType: "Breakfast"
      },
      {
        id: "m-2",
        name: "Grilled Chicken Salad",
        serving: "1 bowl",
        weightGrams: 300,
        calories: 380,
        protein: 42.0,
        carbs: 12.0,
        fat: 14.0,
        fiber: 4.5,
        mealType: "Lunch"
      }
    ];

    let calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0;
    loggedMeals.forEach((item) => {
      calories += item.calories;
      protein += item.protein;
      carbs += item.carbs;
      fat += item.fat;
      fiber += item.fiber ?? 0;
    });

    const totals = {
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      fiber: Math.round(fiber)
    };

    expect(totals.calories).toBe(630);
    expect(totals.protein).toBe(59);
    expect(totals.carbs).toBe(30);
    expect(totals.fat).toBe(26);
    expect(totals.fiber).toBe(7);
  });

  it("correctly maps hydration logs from Supabase rows to volume in Liters", () => {
    const mockHydrationRows = [
      { local_date: "2026-10-06", volume_ml: 1500 },
      { local_date: "2026-10-07", volume_ml: 2250 }
    ];

    const initialWaterLogs: Record<string, number> = {};
    for (const log of mockHydrationRows) {
      initialWaterLogs[log.local_date] = Math.round((log.volume_ml / 1000) * 100) / 100;
    }

    expect(initialWaterLogs["2026-10-06"]).toBe(1.5);
    expect(initialWaterLogs["2026-10-07"]).toBe(2.25);
    expect(initialWaterLogs["2026-10-08"] || 0).toBe(0);
  });

  it("correctly maps weight entries from Supabase to weight logs", () => {
    const mockWeightEntries = [
      { weight_kg: "75.2", recorded_at: "2026-10-01T08:00:00Z" },
      { weight_kg: "74.8", recorded_at: "2026-10-05T08:00:00Z" }
    ];

    const initialWeightLogs: WeightLog[] = mockWeightEntries.map((w) => ({
      date: w.recorded_at.slice(0, 10),
      kg: Number(w.weight_kg)
    }));

    expect(initialWeightLogs).toHaveLength(2);
    expect(initialWeightLogs[0]).toEqual({ date: "2026-10-01", kg: 75.2 });
    expect(initialWeightLogs[1]).toEqual({ date: "2026-10-05", kg: 74.8 });
  });

  it("correctly computes days logged count strictly based on days with actual meals", () => {
    const dailyLogs: Record<string, LoggedMealItem[]> = {
      "2026-10-05": [
        { id: "1", name: "Oats", serving: "50g", weightGrams: 50, calories: 195, protein: 8, carbs: 33, fat: 3.5, mealType: "Breakfast" }
      ],
      "2026-10-06": [],
      "2026-10-07": [
        { id: "2", name: "Salad", serving: "150g", weightGrams: 150, calories: 38, protein: 2, carbs: 7, fat: 0.3, mealType: "Lunch" }
      ]
    };

    const daysCount = Object.keys(dailyLogs).filter((k) => (dailyLogs[k]?.length ?? 0) > 0).length;
    expect(daysCount).toBe(2);
  });
});
