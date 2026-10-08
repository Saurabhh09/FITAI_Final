"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { BrandLogo } from "@/features/brand/brand-logo";
import type { FoodSearchResult } from "@/services/food-data/normalize";
import type { CanonicalFoodDetail, FoodServingOption } from "@/services/food-data/food-detail";

export type TabId = "home" | "progress" | "community" | "profile";
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
  fiber?: number;
  emoji?: string;
  mealType: MealType;
  addedAt?: string;
  source?: string;
  sourceUrl?: string;
};

export type WeightLog = {
  date: string;
  kg: number;
};

export const COMMON_FOODS = [
  { id: "banana", name: "Banana", serving: "1 medium (118g)", grams: 118, cal: 105, p: 1.3, c: 27, f: 0.4, fiber: 3.1, emoji: "🍌" },
  { id: "apple", name: "Apple", serving: "1 medium (182g)", grams: 182, cal: 95, p: 0.5, c: 25, f: 0.3, fiber: 4.4, emoji: "🍎" },
  { id: "oats", name: "Rolled Oats", serving: "1 bowl (50g oats)", grams: 50, cal: 195, p: 8.5, c: 33, f: 3.5, fiber: 5.3, emoji: "🥣" },
  { id: "milk", name: "Whole Milk", serving: "1 glass (240ml)", grams: 240, cal: 149, p: 7.7, c: 11.7, f: 8.0, fiber: 0, emoji: "🥛" },
  { id: "egg", name: "Boiled Eggs", serving: "2 large eggs (100g)", grams: 100, cal: 155, p: 13.0, c: 1.1, f: 11.0, fiber: 0, emoji: "🥚" },
  { id: "roti", name: "Whole Wheat Roti", serving: "2 rotis (70g)", grams: 70, cal: 208, p: 6.7, c: 40.6, f: 2.6, fiber: 6.3, emoji: "🫓" },
  { id: "rice", name: "Basmati Rice", serving: "1 cup cooked (150g)", grams: 150, cal: 195, p: 4.1, c: 42.3, f: 0.5, fiber: 0.6, emoji: "🍚" },
  { id: "dal", name: "Yellow Dal / Lentils", serving: "1 bowl (180g)", grams: 180, cal: 189, p: 12.2, c: 27.4, f: 3.8, fiber: 8.1, emoji: "🍲" },
  { id: "paneer", name: "Fresh Paneer", serving: "100g serving", grams: 100, cal: 265, p: 18.3, c: 3.6, f: 20.8, fiber: 0, emoji: "🧀" },
  { id: "curd", name: "Greek Yogurt / Curd", serving: "1 cup (150g)", grams: 150, cal: 145, p: 13.5, c: 5.4, f: 7.5, fiber: 0, emoji: "🥣" },
  { id: "chicken", name: "Grilled Chicken Breast", serving: "1 breast (150g)", grams: 150, cal: 248, p: 46.5, c: 0, f: 5.4, fiber: 0, emoji: "🍗" },
  { id: "salad", name: "Garden Salad", serving: "1 bowl (150g)", grams: 150, cal: 38, p: 2.3, c: 6.8, f: 0.3, fiber: 3.3, emoji: "🥗" },
  { id: "poha", name: "Flattened Rice Poha", serving: "1 bowl (160g)", grams: 160, cal: 256, p: 5.1, c: 44.8, f: 6.4, fiber: 2.9, emoji: "🍛" },
  { id: "idli", name: "Steamed Idli", serving: "2 pieces (100g)", grams: 100, cal: 135, p: 4.2, c: 28.0, f: 0.6, fiber: 2.1, emoji: "🍚" },
  { id: "almonds", name: "California Almonds", serving: "1 handful (30g)", grams: 30, cal: 174, p: 6.4, c: 6.5, f: 15.0, fiber: 3.8, emoji: "🥜" },
  { id: "protein_shake", name: "Whey Protein Shake", serving: "1 scoop (35g)", grams: 35, cal: 133, p: 25.9, c: 3.2, f: 1.8, fiber: 0.4, emoji: "🥤" },
  { id: "peanut_butter", name: "Natural Peanut Butter", serving: "2 tbsp (32g)", grams: 32, cal: 188, p: 8.0, c: 6.4, f: 16.1, fiber: 1.9, emoji: "🥜" }
];

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

export type DashboardNutritionProfile = {
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
  targetFiberGrams: number;
  targetWaterMl: number;
  weightKg: number;
  targetWeightKg: number | null;
  calorieRollover?: boolean;
};

type Props = {
  displayName: string;
  email: string;
  goal: string;
  ageBand: string | null;
  sex: string | null;
  nutritionProfile: DashboardNutritionProfile;
  initialDailyLogs?: Record<string, LoggedMealItem[]>;
  initialWaterLogs?: Record<string, number>;
  initialWeightLogs?: WeightLog[];
};

export function DashboardView({
  displayName,
  email,
  goal,
  sex,
  nutritionProfile,
  initialDailyLogs,
  initialWaterLogs,
  initialWeightLogs
}: Props) {
  const [tab, setTab] = useState<TabId>("home");
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());

  // Daily logs initialized from real persisted records (empty map if no entries)
  const [dailyLogs, setDailyLogs] = useState<Record<string, LoggedMealItem[]>>(() => initialDailyLogs ?? {});

  // Water logs initialized from real persisted records (empty map if no entries)
  const [waterLogs, setWaterLogs] = useState<Record<string, number>>(() => initialWaterLogs ?? {});

  // Weight logs initialized from real persisted check-in entries (empty list if none recorded yet)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>(() => initialWeightLogs ?? []);

  // Community challenge participation preference (UI state)
  const [joinedChallenge, setJoinedChallenge] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("fitai_joined_challenge");
        if (saved !== null) return saved === "true";
      } catch {}
    }
    return true;
  });

  // Modals state
  const [modalType, setModalType] = useState<"food" | "weight" | null>(null);
  const [modalMealType, setModalMealType] = useState<MealType>("Breakfast");
  const [foodModalTab, setFoodModalTab] = useState<"quick" | "usda" | "describe">("quick");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingUsda, setIsSearchingUsda] = useState(false);
  const [usdaResults, setUsdaResults] = useState<FoodSearchResult[]>([]);
  const [usdaError, setUsdaError] = useState("");
  const [describeText, setDescribeText] = useState("");
  const [weightModalVal, setWeightModalVal] = useState(nutritionProfile.weightKg);
  const [weightModalUnit, setWeightModalUnit] = useState<"kg" | "lb">("kg");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Portion resolution state for selected USDA food
  const [selectedUsdaFood, setSelectedUsdaFood] = useState<CanonicalFoodDetail | null>(null);
  const [isLoadingFoodDetail, setIsLoadingFoodDetail] = useState(false);
  const [selectedPortionId, setSelectedPortionId] = useState<string>("100g");
  const [portionMultiplier, setPortionMultiplier] = useState<number>(1);
  const [customGramInput, setCustomGramInput] = useState<number>(100);
  const [isSubmittingMeal, setIsSubmittingMeal] = useState(false);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }

  // Authoritative database-backed targets from user_nutrition_profiles
  const baseTargetCalories = nutritionProfile.targetCalories;
  const targetProtein = nutritionProfile.targetProteinGrams;
  const targetCarbs = nutritionProfile.targetCarbsGrams;
  const targetFat = nutritionProfile.targetFatGrams;
  const targetFiber = nutritionProfile.targetFiberGrams;
  const targetWater = nutritionProfile.targetWaterMl / 1000;

  // Selected date's logs
  const currentDayMeals = useMemo(() => dailyLogs[selectedDate] || [], [dailyLogs, selectedDate]);
  const currentDayWater = waterLogs[selectedDate] || 0;

  // Derive daily totals strictly from the user's actual meal records
  const dayTotals = useMemo(() => {
    let calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0;
    currentDayMeals.forEach((item) => {
      calories += item.calories;
      protein += item.protein;
      carbs += item.carbs;
      fat += item.fat;
      fiber += item.fiber ?? 0;
    });
    return {
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      fiber: Math.round(fiber)
    };
  }, [currentDayMeals]);

  // Calorie Rollover calculation
  // If enabled: unused budget from yesterday, clamped to [0, 200] kcal.
  // Rule: if no meals logged yesterday or over target, rollover is 0.
  const yesterdayKey = useMemo(() => getYesterdayISO(selectedDate), [selectedDate]);
  const yesterdayMeals = useMemo(() => dailyLogs[yesterdayKey] || [], [dailyLogs, yesterdayKey]);

  const calorieRolloverKcal = useMemo(() => {
    if (!nutritionProfile.calorieRollover) return 0;
    if (yesterdayMeals.length === 0) return 0;
    const yesterdayConsumed = yesterdayMeals.reduce((sum, item) => sum + item.calories, 0);
    const unused = baseTargetCalories - yesterdayConsumed;
    if (unused <= 0) return 0;
    return Math.min(200, Math.round(unused));
  }, [nutritionProfile.calorieRollover, yesterdayMeals, baseTargetCalories]);

  const dailyAvailableBudget = baseTargetCalories + calorieRolloverKcal;
  const caloriesLeft = Math.max(0, dailyAvailableBudget - dayTotals.calories);
  const caloriePercent = Math.min(100, Math.round((dayTotals.calories / (dailyAvailableBudget || 1)) * 100));

  // Handlers for Food Logging
  async function handleSelectUsdaFoodForPortion(fdcId: string) {
    setIsLoadingFoodDetail(true);
    setUsdaError("");
    try {
      const res = await fetch(`/api/foods/${encodeURIComponent(fdcId)}`, {
        credentials: "same-origin"
      });
      const data = await res.json();
      if (!res.ok) {
        setUsdaError(data.error || "Could not load food details from USDA.");
        return;
      }
      const food: CanonicalFoodDetail = data.food;
      setSelectedUsdaFood(food);
      const defaultPortion = food.servings.find((s) => s.isDefault) || food.servings[0];
      setSelectedPortionId(defaultPortion?.sourcePortionId || "100g");
      setPortionMultiplier(1);
      setCustomGramInput(defaultPortion?.gramWeight || 100);
    } catch {
      setUsdaError("Failed to connect to food detail service.");
    } finally {
      setIsLoadingFoodDetail(false);
    }
  }

  // Calculate calculated gram weight based on selected portion
  const computedQuantityGrams = useMemo(() => {
    if (!selectedUsdaFood) return 100;
    if (selectedPortionId === "custom_grams") {
      return Math.max(1, Math.min(5000, Number(customGramInput) || 100));
    }
    const found = selectedUsdaFood.servings.find((s) => s.sourcePortionId === selectedPortionId);
    const baseWeight = found?.gramWeight || 100;
    return Math.max(1, Math.min(5000, Math.round(baseWeight * (Number(portionMultiplier) || 1) * 10) / 10));
  }, [selectedUsdaFood, selectedPortionId, portionMultiplier, customGramInput]);

  // Nutrient preview calculation for selected USDA food
  const nutrientPreview = useMemo(() => {
    if (!selectedUsdaFood) return null;
    const factor = computedQuantityGrams / 100;
    const cal = selectedUsdaFood.nutrients.find((n) => n.nutrientId === "1008")?.amountPer100g;
    const p = selectedUsdaFood.nutrients.find((n) => n.nutrientId === "1003")?.amountPer100g;
    const c = selectedUsdaFood.nutrients.find((n) => n.nutrientId === "1005")?.amountPer100g;
    const f = selectedUsdaFood.nutrients.find((n) => n.nutrientId === "1004")?.amountPer100g;
    const fiber = selectedUsdaFood.nutrients.find((n) => n.nutrientId === "1079")?.amountPer100g;

    return {
      calories: cal !== null && cal !== undefined ? Math.round(cal * factor) : null,
      protein: p !== null && p !== undefined ? Math.round(p * factor * 10) / 10 : null,
      carbs: c !== null && c !== undefined ? Math.round(c * factor * 10) / 10 : null,
      fat: f !== null && f !== undefined ? Math.round(f * factor * 10) / 10 : null,
      fiber: fiber !== null && fiber !== undefined ? Math.round(fiber * factor * 10) / 10 : null
    };
  }, [selectedUsdaFood, computedQuantityGrams]);

  async function handleConfirmLogUsdaFood() {
    if (!selectedUsdaFood) return;
    setIsSubmittingMeal(true);
    setUsdaError("");

    let servingDesc = `${Math.round(computedQuantityGrams)}g`;
    if (selectedPortionId !== "custom_grams") {
      const found = selectedUsdaFood.servings.find((s) => s.sourcePortionId === selectedPortionId);
      if (found) {
        servingDesc = portionMultiplier === 1 ? found.description : `${portionMultiplier}x ${found.description}`;
      }
    }

    try {
      const res = await fetch("/api/nutrition/meals/item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          date: selectedDate,
          mealType: modalMealType,
          fdcId: selectedUsdaFood.sourceFoodId,
          foodId: selectedUsdaFood.id,
          quantityGrams: computedQuantityGrams,
          nameSnapshot: selectedUsdaFood.description,
          servingDescription: servingDesc
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setUsdaError(data.error || "Could not log meal item.");
        return;
      }

      const loggedItem: LoggedMealItem = data.item;
      setDailyLogs((prev) => {
        const existing = prev[selectedDate] || [];
        return {
          ...prev,
          [selectedDate]: [...existing, loggedItem]
        };
      });

      setModalType(null);
      setSelectedUsdaFood(null);
      showToast(`Logged ${loggedItem.name}`);
    } catch {
      setUsdaError("Could not connect to meal logging service.");
    } finally {
      setIsSubmittingMeal(false);
    }
  }

  async function handleLogQuickFood(cf: typeof COMMON_FOODS[number]) {
    try {
      const res = await fetch("/api/nutrition/meals/item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          date: selectedDate,
          mealType: modalMealType,
          quickFoodId: cf.id,
          quantityGrams: cf.grams,
          nameSnapshot: cf.name,
          servingDescription: cf.serving
        })
      });

      const data = await res.json();
      if (res.ok && data.item) {
        const loggedItem: LoggedMealItem = { ...data.item, emoji: cf.emoji };
        setDailyLogs((prev) => {
          const existing = prev[selectedDate] || [];
          return {
            ...prev,
            [selectedDate]: [...existing, loggedItem]
          };
        });
        setModalType(null);
        showToast(`Logged ${cf.name}`);
      } else {
        // Server request failed: show clear error, do NOT append locally, do NOT modify daily totals
        showToast(data?.error || `Could not log ${cf.name}`);
      }
    } catch {
      // Network/request failure: show clear error, do NOT append locally, do NOT modify daily totals
      showToast("Could not connect to meal logging service.");
    }
  }

  async function removeFoodItem(id: string) {
    setDailyLogs((prev) => {
      const existing = prev[selectedDate] || [];
      return {
        ...prev,
        [selectedDate]: existing.filter((it) => it.id !== id)
      };
    });
    showToast("Removed food item");

    try {
      await fetch(`/api/nutrition/meals/item/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "same-origin"
      });
    } catch {
      // Graceful fallback
    }
  }

  async function addWater(amount: number) {
    const current = waterLogs[selectedDate] || 0;
    const newVolumeL = Math.min(6, Math.round((current + amount) * 100) / 100);
    setWaterLogs((prev) => ({
      ...prev,
      [selectedDate]: newVolumeL
    }));
    showToast(`+${Math.round(amount * 1000)} ml water added`);

    try {
      await fetch("/api/nutrition/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          date: selectedDate,
          volumeMl: Math.round(newVolumeL * 1000)
        })
      });
    } catch {
      // Graceful fallback for offline / test environments
    }
  }

  async function handleSaveWeight(kg: number) {
    const roundedKg = Math.round(kg * 10) / 10;
    setWeightLogs((prev) => [...prev, { date: selectedDate, kg: roundedKg }]);
    setModalType(null);
    showToast(`Logged ${roundedKg.toFixed(1)} kg check-in`);

    try {
      await fetch("/api/nutrition/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          weightKg: roundedKg,
          recordedAt: `${selectedDate}T12:00:00.000Z`
        })
      });
    } catch {
      // Graceful fallback for offline / test environments
    }
  }

  async function handleUsdaSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim().length < 2) return;
    setIsSearchingUsda(true);
    setUsdaError("");
    setSelectedUsdaFood(null);
    try {
      const res = await fetch(`/api/foods/search?q=${encodeURIComponent(searchQuery.trim())}&limit=12`, {
        credentials: "same-origin"
      });
      const data = await res.json();
      if (!res.ok) {
        setUsdaError(data.error || "Could not search USDA database.");
      } else {
        setUsdaResults(data.foods || []);
      }
    } catch {
      setUsdaError("Could not connect to food service.");
    } finally {
      setIsSearchingUsda(false);
    }
  }

  function handleNaturalLanguageEstimate() {
    if (!describeText.trim()) return;
    const lower = describeText.toLowerCase();
    let found = COMMON_FOODS.find((f) => lower.includes(f.id) || lower.includes(f.name.toLowerCase()));
    if (!found) found = COMMON_FOODS[0];

    handleLogQuickFood(found);
  }

  // Week strip calculation
  const weekDays = useMemo(() => {
    const sel = dateFromISO(selectedDate);
    const dayOfWeek = (sel.getDay() + 6) % 7;
    const monday = new Date(sel);
    monday.setDate(sel.getDate() - dayOfWeek);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = dateKey(d);
      return {
        iso,
        dateNum: d.getDate(),
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        isToday: iso === todayISO(),
        isActive: iso === selectedDate
      };
    });
  }, [selectedDate]);

  const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].kg : nutritionProfile.weightKg;
  const daysLoggedCount = useMemo(() => {
    return Object.keys(dailyLogs).filter((k) => (dailyLogs[k]?.length ?? 0) > 0).length;
  }, [dailyLogs]);

  const goalTitle =
    goal === "lose_weight" || goal === "lose"
      ? "Lose Weight"
      : goal === "gain_weight" || goal === "gain"
      ? "Gain Weight"
      : goal === "maintain"
      ? "Maintain Weight"
      : goal === "improve_energy"
      ? "Improve Energy"
      : goal === "habit_consistency"
      ? "Habit Consistency"
      : goal === "sports_performance"
      ? "Sports Performance"
      : "Healthy Lifestyle";
  const targetWeightKg = nutritionProfile.targetWeightKg;

  return (
    <div className="dashboard-shell" style={{ minHeight: "100vh", background: "#F8F7FB" }}>
      {/* Sidebar Navigation */}
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <BrandLogo />
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <button
            type="button"
            className={`nav-item${tab === "home" ? " active" : ""}`}
            onClick={() => setTab("home")}
          >
            <span className="icon">🏠</span>
            <span>Home</span>
          </button>
          <button
            type="button"
            className={`nav-item${tab === "progress" ? " active" : ""}`}
            onClick={() => setTab("progress")}
          >
            <span className="icon">📊</span>
            <span>Progress</span>
          </button>
          <button
            type="button"
            className={`nav-item${tab === "community" ? " active" : ""}`}
            onClick={() => setTab("community")}
          >
            <span className="icon">👥</span>
            <span>Community</span>
          </button>
          <button
            type="button"
            className={`nav-item${tab === "profile" ? " active" : ""}`}
            onClick={() => setTab("profile")}
          >
            <span className="icon">👤</span>
            <span>Profile</span>
          </button>
        </nav>

        <div className="sidebar-spacer" />

        {/* Focus Goal Card */}
        <div className="side-goal-card" style={{ padding: "14px 16px", borderRadius: 18, background: "#FAF9FC", border: "1px solid #ECEAF2", marginBottom: 14 }}>
          <p className="eyebrow" style={{ fontSize: 9 }}>YOUR CURRENT FOCUS</p>
          <strong style={{ fontSize: 13, display: "block", marginTop: 2 }}>{goalTitle}</strong>
          <p style={{ margin: "3px 0 0", color: "#8E8896", fontSize: 11 }}>
            {baseTargetCalories} kcal/day · {targetProtein}g protein
          </p>
        </div>

        {/* User Card */}
        <div className="sidebar-user" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span className="avatar" style={{ width: 32, height: 32, borderRadius: 10, background: "#211F25", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 11 }}>
              {(displayName || "F").slice(0, 2).toUpperCase()}
            </span>
            <div style={{ minWidth: 0 }}>
              <strong style={{ fontSize: 12, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayName || "FITAI Member"}
              </strong>
              <span style={{ fontSize: 10, color: "#8E8896" }}>{goalTitle}</span>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="dashboard-main" style={{ paddingBottom: 100 }}>
        {/* ===================== TAB 1: HOME ===================== */}
        {tab === "home" && (
          <div className="dashboard-inner fade-in">
            {/* Top Bar for Mobile Branding & Quick Actions */}
            <div className="dash-topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div className="dash-mobile-brand">
                <BrandLogo />
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className="streak-pill" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: "#FFF5EF", color: "#C66E45", fontSize: 12, fontWeight: 700 }}>
                  🔥 {daysLoggedCount > 0 ? `${daysLoggedCount} day streak` : "Start logging"}
                </span>
                <Link className="btn btn-light btn-small" href="/onboarding" style={{ height: 36, fontSize: 12 }}>
                  ✏️ Review Plan
                </Link>
              </div>
            </div>

            {/* Welcome & Quick Log Header */}
            <div className="dash-welcome" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 30, letterSpacing: "-0.04em", fontWeight: 800 }}>
                  Good day, {(displayName || "there").split(" ")[0]}
                </h1>
                <p style={{ margin: "4px 0 0", color: "#8E8896", fontSize: 14 }}>
                  {dateFromISO(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · {goalTitle}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-small"
                onClick={() => {
                  setModalMealType("Breakfast");
                  setModalType("food");
                  setFoodModalTab("quick");
                  setSelectedUsdaFood(null);
                }}
                style={{ height: 42, padding: "0 18px", fontSize: 13 }}
              >
                + Log Food
              </button>
            </div>

            {/* Weekly Date Selector Strip */}
            <div className="week-strip" style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
              {weekDays.map((day) => (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => setSelectedDate(day.iso)}
                  style={{
                    flex: 1,
                    minWidth: 44,
                    minHeight: 64,
                    borderRadius: 16,
                    border: "1px solid",
                    borderColor: day.isActive ? "#211F25" : "#EAE8EE",
                    background: day.isActive ? "#211F25" : day.isToday ? "#F2EFF8" : "#FFFFFF",
                    color: day.isActive ? "#FFFFFF" : "#211F25",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  aria-pressed={day.isActive}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, opacity: day.isActive ? 0.85 : 0.6 }}>{day.dayName}</span>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>{day.dateNum}</span>
                </button>
              ))}
            </div>

            {/* Main Dash Grid: Primary & Secondary */}
            <div className="dash-main-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
              {/* Primary Column: Calories + Macros + Meals */}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Calorie Card */}
                <section className="calorie-card" style={{ padding: 24, borderRadius: 24, background: "#FFFFFF", border: "1px solid #EAE8EE", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <span className="eyebrow" style={{ fontSize: 10 }}>CALORIES LEFT TODAY</span>
                    <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.05em", margin: "4px 0" }}>
                      {caloriesLeft}
                    </div>
                    <div style={{ fontSize: 12, color: "#8E8896" }}>
                      <strong>{dayTotals.calories}</strong> eaten of <strong>{dailyAvailableBudget}</strong> kcal
                      {calorieRolloverKcal > 0 && (
                        <span style={{ marginLeft: 6, color: "#C66E45", fontWeight: 700 }}>
                          (+{calorieRolloverKcal} rollover)
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ position: "relative", width: 100, height: 100 }}>
                    <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#EFEFF4" strokeWidth="3.6" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#211F25" strokeWidth="3.6" strokeDasharray={`${caloriePercent}, 100`} strokeLinecap="round" />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 16, fontWeight: 800 }}>{caloriePercent}%</span>
                    </div>
                  </div>
                </section>

                {/* Macro Cards Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {/* Protein */}
                  <div style={{ padding: 14, borderRadius: 18, background: "#FFFFFF", border: "1px solid #EAE8EE" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#8E8896", letterSpacing: "0.08em" }}>PROTEIN</span>
                    <div style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 2px" }}>{Math.max(0, targetProtein - dayTotals.protein)}g</div>
                    <span style={{ fontSize: 10, color: "#8E8896" }}>left of {targetProtein}g</span>
                    <div style={{ height: 5, borderRadius: 99, background: "#EFEFF4", marginTop: 8, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (dayTotals.protein / (targetProtein || 1)) * 100)}%`, background: "#D99C79", borderRadius: 99 }} />
                    </div>
                  </div>

                  {/* Carbs */}
                  <div style={{ padding: 14, borderRadius: 18, background: "#FFFFFF", border: "1px solid #EAE8EE" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#8E8896", letterSpacing: "0.08em" }}>CARBS</span>
                    <div style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 2px" }}>{Math.max(0, targetCarbs - dayTotals.carbs)}g</div>
                    <span style={{ fontSize: 10, color: "#8E8896" }}>left of {targetCarbs}g</span>
                    <div style={{ height: 5, borderRadius: 99, background: "#EFEFF4", marginTop: 8, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (dayTotals.carbs / (targetCarbs || 1)) * 100)}%`, background: "#739BCB", borderRadius: 99 }} />
                    </div>
                  </div>

                  {/* Fats */}
                  <div style={{ padding: 14, borderRadius: 18, background: "#FFFFFF", border: "1px solid #EAE8EE" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#8E8896", letterSpacing: "0.08em" }}>FATS</span>
                    <div style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 2px" }}>{Math.max(0, targetFat - dayTotals.fat)}g</div>
                    <span style={{ fontSize: 10, color: "#8E8896" }}>left of {targetFat}g</span>
                    <div style={{ height: 5, borderRadius: 99, background: "#EFEFF4", marginTop: 8, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (dayTotals.fat / (targetFat || 1)) * 100)}%`, background: "#D76891", borderRadius: 99 }} />
                    </div>
                  </div>
                </div>

                {/* Meal Categories */}
                <section className="card-surface" style={{ padding: 22, borderRadius: 24, background: "#FFFFFF", border: "1px solid #EAE8EE" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Today&apos;s Food Log</h2>
                      <p style={{ margin: "2px 0 0", color: "#8E8896", fontSize: 12 }}>Log meals to track your nutrition progress</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {(["Breakfast", "Lunch", "Dinner", "Snacks"] as MealType[]).map((mType) => {
                      const items = currentDayMeals.filter((it) => it.mealType === mType);
                      const subKcal = items.reduce((sum, it) => sum + it.calories, 0);

                      return (
                        <div key={mType} style={{ padding: 14, borderRadius: 16, background: "#FAF9FB", border: "1px solid #ECEAF2" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: items.length ? 10 : 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 18 }}>
                                {mType === "Breakfast" ? "☀️" : mType === "Lunch" ? "🥗" : mType === "Dinner" ? "🌙" : "🍓"}
                              </span>
                              <strong style={{ fontSize: 14 }}>{mType}</strong>
                              {subKcal > 0 ? (
                                <span style={{ fontSize: 12, color: "#8E8896", marginLeft: 4 }}>({subKcal} kcal)</span>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              className="btn btn-light btn-small"
                              onClick={() => {
                                setModalMealType(mType);
                                setModalType("food");
                                setFoodModalTab("quick");
                                setSelectedUsdaFood(null);
                                setSearchQuery("");
                                setUsdaResults([]);
                              }}
                              style={{ height: 32, padding: "0 12px", fontSize: 11 }}
                            >
                              + Add
                            </button>
                          </div>

                          {items.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {items.map((it) => (
                                <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: "#FFFFFF", borderRadius: 10, border: "1px solid #EAE8EE" }}>
                                  <div style={{ minWidth: 0, paddingRight: 8 }}>
                                    <strong style={{ fontSize: 12, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {it.emoji ? `${it.emoji} ` : ""}{it.name}
                                    </strong>
                                    <span style={{ fontSize: 10, color: "#8E8896" }}>
                                      {it.serving} · {it.calories} kcal · P {it.protein}g · C {it.carbs}g · F {it.fat}g
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeFoodItem(it.id)}
                                    style={{ background: "none", border: 0, color: "#BE5E64", fontSize: 16, cursor: "pointer", padding: "0 4px" }}
                                    title="Remove item"
                                    aria-label={`Remove ${it.name}`}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ margin: "6px 0 0", color: "#8E8896", fontSize: 12 }}>No meals logged yet</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* Secondary Column: Coach + Water + Micronutrients */}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Coaching & Guidance Card */}
                <section className="coach-card" style={{ padding: 20, borderRadius: 22, background: "#FFFFFF", border: "1px solid #EAE8EE" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>✨</span>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Smart Guidance</h3>
                  </div>
                  <p style={{ margin: 0, color: "#74707D", fontSize: 13, lineHeight: 1.55 }}>
                    Progress comes from steady habits. A modest surplus or deficit that you can stick with is far more effective than rigid restrictions.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab("progress")}
                    style={{ background: "none", border: 0, padding: "8px 0 0", color: "#211F25", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    View your weekly trends →
                  </button>
                </section>

                {/* Hydration Card */}
                <section className="water-card" style={{ padding: 20, borderRadius: 22, background: "#FFFFFF", border: "1px solid #EAE8EE" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 18 }}>💧</span>
                      <strong style={{ fontSize: 14 }}>Hydration</strong>
                    </div>
                    <strong style={{ fontSize: 15 }}>{currentDayWater.toFixed(1)} / {targetWater.toFixed(1)} L</strong>
                  </div>

                  <div style={{ height: 8, borderRadius: 99, background: "#EAE7F2", overflow: "hidden", marginBottom: 14 }}>
                    <div style={{ height: "100%", width: `${Math.min(100, (currentDayWater / (targetWater || 1)) * 100)}%`, background: "#739BCB", borderRadius: 99 }} />
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-light btn-small"
                      onClick={() => addWater(0.25)}
                      style={{ flex: 1, height: 36, fontSize: 11 }}
                    >
                      + 250 ml (Glass)
                    </button>
                    <button
                      type="button"
                      className="btn btn-light btn-small"
                      onClick={() => addWater(0.5)}
                      style={{ flex: 1, height: 36, fontSize: 11 }}
                    >
                      + 500 ml (Bottle)
                    </button>
                  </div>
                </section>

                {/* Micronutrients / Fiber Card */}
                <section style={{ padding: 20, borderRadius: 22, background: "#FFFFFF", border: "1px solid #EAE8EE" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <strong style={{ fontSize: 14 }}>Nutrient Details</strong>
                    <span style={{ fontSize: 16 }}>🥗</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "#74707D" }}>Dietary Fiber</span>
                        <strong>{dayTotals.fiber}g / {targetFiber}g</strong>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: "#EAE7F2", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, (dayTotals.fiber / (targetFiber || 1)) * 100)}%`, background: "#78B887", borderRadius: 99 }} />
                      </div>
                    </div>

                    <div style={{ paddingTop: 8, borderTop: "1px solid #F0EEF5", display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8E8896" }}>
                      <span>USDA Database Access</span>
                      <span style={{ color: "#3B344A", fontWeight: 700 }}>Active</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: PROGRESS ===================== */}
        {tab === "progress" && (
          <div className="dashboard-inner tab-page fade-in">
            <div className="tab-page-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <p className="eyebrow">YOUR TRENDS</p>
                <h1 style={{ margin: "4px 0 0", fontSize: 32, fontWeight: 800 }}>Progress & Check-ins</h1>
                <p style={{ margin: "4px 0 0", color: "#8E8896", fontSize: 14 }}>View patterns over time without the pressure to be perfect.</p>
              </div>
              <button
                type="button"
                className="btn btn-light btn-small"
                onClick={() => setModalType("weight")}
                style={{ height: 40, fontSize: 12 }}
              >
                ⚖️ Log Weight Check-in
              </button>
            </div>

            {/* Stats Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
              <div style={{ padding: 18, borderRadius: 20, background: "#FFFFFF", border: "1px solid #EAE8EE" }}>
                <span className="eyebrow" style={{ fontSize: 9 }}>CURRENT WEIGHT</span>
                <div style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 2px" }}>{latestWeight.toFixed(1)} kg</div>
                <small style={{ color: "#8E8896", fontSize: 11 }}>
                  {targetWeightKg !== null ? `Target: ${targetWeightKg.toFixed(1)} kg` : "Goal: Maintain weight"}
                </small>
              </div>

              <div style={{ padding: 18, borderRadius: 20, background: "#FFFFFF", border: "1px solid #EAE8EE" }}>
                <span className="eyebrow" style={{ fontSize: 9 }}>DAILY CALORIE GUIDE</span>
                <div style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 2px" }}>{baseTargetCalories}</div>
                <small style={{ color: "#8E8896", fontSize: 11 }}>Personalized estimate · kcal</small>
              </div>

              <div style={{ padding: 18, borderRadius: 20, background: "#FFFFFF", border: "1px solid #EAE8EE" }}>
                <span className="eyebrow" style={{ fontSize: 9 }}>DAYS LOGGED</span>
                <div style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 2px" }}>{daysLoggedCount}</div>
                <small style={{ color: "#8E8896", fontSize: 11 }}>Continuous habit tracking</small>
              </div>
            </div>

            {/* Weight Trend Chart */}
            <section style={{ padding: 24, borderRadius: 24, background: "#FFFFFF", border: "1px solid #EAE8EE", marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Weight Trend</h2>
                  <p style={{ margin: "2px 0 0", color: "#8E8896", fontSize: 12 }}>Check-ins you record over time</p>
                </div>
                <span className="workspace-status" style={{ fontSize: 11 }}>
                  {targetWeightKg !== null ? `Goal: ${targetWeightKg.toFixed(1)} kg` : "Goal: Maintain"}
                </span>
              </div>

              {weightLogs.length > 0 ? (
                <div style={{ height: 180, display: "flex", alignItems: "flex-end", gap: 12, padding: "20px 0", borderBottom: "1px solid #EAE8EE" }}>
                  {weightLogs.map((log, i) => (
                    <div key={log.date + i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{log.kg} kg</span>
                      <div style={{ width: 14, height: Math.max(20, (log.kg / 100) * 120), borderRadius: 99, background: "#211F25" }} />
                      <span style={{ fontSize: 10, color: "#8E8896" }}>{log.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ height: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "20px 0", borderBottom: "1px solid #EAE8EE", color: "#8E8896" }}>
                  <span style={{ fontSize: 28 }}>⚖️</span>
                  <strong style={{ fontSize: 14, color: "#211F25" }}>No weight history yet</strong>
                  <p style={{ margin: 0, fontSize: 12 }}>Record your first check-in to begin tracking weight trends.</p>
                </div>
              )}
              <p style={{ margin: "12px 0 0", color: "#8E8896", fontSize: 11 }}>
                Scale weight naturally fluctuates daily. Focus on long-term trends and overall energy.
              </p>
            </section>
          </div>
        )}

        {/* ===================== TAB 3: COMMUNITY / CHALLENGE ===================== */}
        {tab === "community" && (
          <div className="dashboard-inner tab-page fade-in">
            <div className="tab-page-heading" style={{ marginBottom: 20 }}>
              <p className="eyebrow">YOUR SUPPORT SPACE</p>
              <h1 style={{ margin: "4px 0 0", fontSize: 32, fontWeight: 800 }}>Small Steps, Together</h1>
              <p style={{ margin: "4px 0 0", color: "#8E8896", fontSize: 14 }}>A gentle rhythm to build healthy habits without pressure.</p>
            </div>

            <section style={{ padding: 28, borderRadius: 24, background: "#FFFFFF", border: "1px solid #EAE8EE", marginBottom: 24 }}>
              <span className="eyebrow" style={{ color: "#D99C79" }}>7-DAY GENTLE HABIT CHALLENGE</span>
              <h2 style={{ margin: "6px 0 8px", fontSize: 24, fontWeight: 800 }}>Notice one thing about your meals</h2>
              <p style={{ margin: 0, color: "#74707D", fontSize: 14, lineHeight: 1.6, maxWidth: 580 }}>
                For one week, log a meal or drink water whenever it feels helpful. You can skip days without losing momentum.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(64px, 1fr))", gap: 8, margin: "24px 0" }}>
                {Array.from({ length: 7 }, (_, i) => {
                  const done = i < Math.min(7, daysLoggedCount);
                  return (
                    <div
                      key={i}
                      style={{
                        padding: "14px 6px",
                        borderRadius: 16,
                        border: "1px solid",
                        borderColor: done ? "#211F25" : "#EAE8EE",
                        background: done ? "#211F25" : "#FAF9FB",
                        color: done ? "#FFFFFF" : "#8E8896",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{done ? "✓" : i + 1}</span>
                      <span style={{ fontSize: 10, fontWeight: 700 }}>Day {i + 1}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={`btn ${joinedChallenge ? "btn-light" : ""}`}
                  onClick={() => {
                    const next = !joinedChallenge;
                    setJoinedChallenge(next);
                    try {
                      localStorage.setItem("fitai_joined_challenge", String(next));
                    } catch {}
                    showToast(next ? "Joined 7-day challenge!" : "Challenge reset");
                  }}
                  style={{ height: 44, padding: "0 22px", fontSize: 13 }}
                >
                  {joinedChallenge ? "You’re Participating · Keep Going" : "Join 7-Day Challenge"}
                </button>
                <span style={{ fontSize: 12, color: "#8E8896" }}>Your habit logs stay private to your account.</span>
              </div>
            </section>
          </div>
        )}

        {/* ===================== TAB 4: PROFILE & SETTINGS ===================== */}
        {tab === "profile" && (
          <div className="dashboard-inner tab-page fade-in">
            <div className="tab-page-heading" style={{ marginBottom: 20 }}>
              <p className="eyebrow">YOUR DETAILS</p>
              <h1 style={{ margin: "4px 0 0", fontSize: 32, fontWeight: 800 }}>Profile & Settings</h1>
              <p style={{ margin: "4px 0 0", color: "#8E8896", fontSize: 14 }}>Your plan, account credentials, and tracking preferences.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
              {/* Profile Overview Card */}
              <section style={{ padding: 24, borderRadius: 24, background: "#FFFFFF", border: "1px solid #EAE8EE" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                  <span style={{ width: 50, height: 50, borderRadius: 16, background: "#211F25", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 18 }}>
                    {(displayName || "F").slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{displayName || "FITAI Member"}</h2>
                    <span style={{ color: "#8E8896", fontSize: 12 }}>{email}</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F0EEF5", fontSize: 13 }}>
                    <span style={{ color: "#74707D" }}>Primary Goal</span>
                    <strong>{goalTitle}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F0EEF5", fontSize: 13 }}>
                    <span style={{ color: "#74707D" }}>Current Weight</span>
                    <strong>{latestWeight.toFixed(1)} kg</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F0EEF5", fontSize: 13 }}>
                    <span style={{ color: "#74707D" }}>Daily Calorie Target</span>
                    <strong>{baseTargetCalories} kcal</strong>
                  </div>
                  {nutritionProfile.calorieRollover && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F0EEF5", fontSize: 13 }}>
                      <span style={{ color: "#74707D" }}>Calorie Rollover</span>
                      <strong style={{ color: "#C66E45" }}>Active (up to 200 kcal/day)</strong>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F0EEF5", fontSize: 13 }}>
                    <span style={{ color: "#74707D" }}>Sex for Reference</span>
                    <strong>{sex ? sex.charAt(0).toUpperCase() + sex.slice(1) : "Neutral estimate"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F0EEF5", fontSize: 13 }}>
                    <span style={{ color: "#74707D" }}>USDA Food Data</span>
                    <strong style={{ color: "#78B887" }}>Connected & Active</strong>
                  </div>
                </div>
              </section>

              {/* Actions & Plan Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <section style={{ padding: 22, borderRadius: 24, background: "#FFFFFF", border: "1px solid #EAE8EE" }}>
                  <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800 }}>Plan Quick Settings</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Link className="btn btn-light btn-small" href="/onboarding" style={{ justifyContent: "flex-start", height: 44 }}>
                      <span>✏️ Review & Update All Questions</span>
                    </Link>
                    <button
                      type="button"
                      className="btn btn-light btn-small"
                      onClick={() => {
                        setWeightModalVal(latestWeight);
                        setModalType("weight");
                      }}
                      style={{ justifyContent: "flex-start", height: 44 }}
                    >
                      <span>⚖️ Record New Weight Entry</span>
                    </button>
                  </div>
                </section>

                <section style={{ padding: 20, borderRadius: 24, background: "#FFFFFF", border: "1px solid #EAE8EE" }}>
                  <SignOutButton />
                </section>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===================== MOBILE BOTTOM NAV ===================== */}
      <div className="mobile-nav-wrap">
        <nav className="mobile-nav" aria-label="Main navigation">
          <button
            type="button"
            className={tab === "home" ? "active" : ""}
            onClick={() => setTab("home")}
          >
            <span style={{ fontSize: 18 }}>🏠</span>
            <span>Home</span>
          </button>
          <button
            type="button"
            className={tab === "progress" ? "active" : ""}
            onClick={() => setTab("progress")}
          >
            <span style={{ fontSize: 18 }}>📊</span>
            <span>Progress</span>
          </button>
          <button
            type="button"
            className={tab === "community" ? "active" : ""}
            onClick={() => setTab("community")}
          >
            <span style={{ fontSize: 18 }}>👥</span>
            <span>Groups</span>
          </button>
          <button
            type="button"
            className={tab === "profile" ? "active" : ""}
            onClick={() => setTab("profile")}
          >
            <span style={{ fontSize: 18 }}>👤</span>
            <span>Profile</span>
          </button>
        </nav>
        <button
          type="button"
          className="nav-fab"
          onClick={() => {
            setModalMealType("Breakfast");
            setModalType("food");
            setFoodModalTab("quick");
            setSelectedUsdaFood(null);
          }}
          aria-label="Add a meal"
        >
          +
        </button>
      </div>

      {/* ===================== MODAL 1: FOOD LOGGER ===================== */}
      {modalType === "food" && (
        <div className="modal-backdrop" onClick={() => setModalType(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ width: "min(100%, 640px)" }}>
            <div className="modal-header">
              <div>
                <h2>Add to {modalMealType}</h2>
                <p>Pick from quick everyday foods or search the USDA FoodData Central catalog.</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setModalType(null);
                  setSelectedUsdaFood(null);
                }}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {/* Portion Selection Step for USDA Food */}
              {selectedUsdaFood ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedUsdaFood(null)}
                    style={{ background: "none", border: 0, padding: 0, color: "#211F25", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    ← Back to Search Results
                  </button>

                  <div style={{ padding: 14, borderRadius: 14, background: "#FAF9FB", border: "1px solid #ECEAF2" }}>
                    <strong style={{ fontSize: 15, display: "block" }}>{selectedUsdaFood.description}</strong>
                    <span style={{ fontSize: 11, color: "#8E8896" }}>
                      {selectedUsdaFood.foodCategory || selectedUsdaFood.sourceDataType} {selectedUsdaFood.brandOwner ? `· ${selectedUsdaFood.brandOwner}` : ""}
                    </span>
                  </div>

                  {/* Serving selector */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      Serving Size Option:
                    </label>
                    <select
                      className="text-input"
                      value={selectedPortionId}
                      onChange={(e) => {
                        setSelectedPortionId(e.target.value);
                        if (e.target.value !== "custom_grams") {
                          const found = selectedUsdaFood.servings.find((s) => s.sourcePortionId === e.target.value);
                          if (found) setCustomGramInput(found.gramWeight);
                        }
                      }}
                      style={{ height: 42, width: "100%", fontSize: 13 }}
                    >
                      {selectedUsdaFood.servings.map((s) => (
                        <option key={s.sourcePortionId} value={s.sourcePortionId}>
                          {s.description} ({s.gramWeight}g)
                        </option>
                      ))}
                      <option value="custom_grams">Custom Grams (weighed)</option>
                    </select>
                  </div>

                  {/* Quantity input */}
                  {selectedPortionId === "custom_grams" ? (
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                        Weight (grams):
                      </label>
                      <input
                        type="number"
                        className="text-input"
                        min={1}
                        max={5000}
                        step={1}
                        value={customGramInput}
                        onChange={(e) => setCustomGramInput(Number(e.target.value))}
                        style={{ height: 42, width: "100%", fontSize: 14 }}
                      />
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                        Number of Servings:
                      </label>
                      <input
                        type="number"
                        className="text-input"
                        min={0.1}
                        max={50}
                        step={0.25}
                        value={portionMultiplier}
                        onChange={(e) => setPortionMultiplier(Number(e.target.value))}
                        style={{ height: 42, width: "100%", fontSize: 14 }}
                      />
                    </div>
                  )}

                  {/* Live calculated macros preview */}
                  <div style={{ padding: 12, borderRadius: 12, background: "#FFFFFF", border: "1px solid #ECEAF2" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: "#8E8896" }}>Calculated Weight:</span>
                      <strong>{Math.round(computedQuantityGrams)} grams</strong>
                    </div>
                    {nutrientPreview && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, textAlign: "center", paddingTop: 8, borderTop: "1px solid #F0EEF5" }}>
                        <div>
                          <span style={{ fontSize: 10, color: "#8E8896", display: "block" }}>CALORIES</span>
                          <strong style={{ fontSize: 14 }}>{nutrientPreview.calories ?? "—"} kcal</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, color: "#8E8896", display: "block" }}>PROTEIN</span>
                          <strong style={{ fontSize: 14 }}>{nutrientPreview.protein ?? "—"}g</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, color: "#8E8896", display: "block" }}>CARBS</span>
                          <strong style={{ fontSize: 14 }}>{nutrientPreview.carbs ?? "—"}g</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, color: "#8E8896", display: "block" }}>FAT</span>
                          <strong style={{ fontSize: 14 }}>{nutrientPreview.fat ?? "—"}g</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {usdaError && <p className="auth-error" style={{ margin: 0 }}>{usdaError}</p>}

                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    <button
                      type="button"
                      className="btn btn-light"
                      onClick={() => setSelectedUsdaFood(null)}
                      style={{ flex: 1, height: 44 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={isSubmittingMeal || computedQuantityGrams <= 0}
                      onClick={handleConfirmLogUsdaFood}
                      style={{ flex: 2, height: 44 }}
                    >
                      {isSubmittingMeal ? "Logging to Food Record…" : `+ Add to ${modalMealType}`}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Meal Selector */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }}>
                    {(["Breakfast", "Lunch", "Dinner", "Snacks"] as MealType[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`btn btn-small ${modalMealType === m ? "" : "btn-light"}`}
                        onClick={() => setModalMealType(m)}
                        style={{ height: 34, padding: "0 12px", fontSize: 11 }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* Tab Selector */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <button
                      type="button"
                      className={foodModalTab === "quick" ? "btn btn-small" : "btn btn-light btn-small"}
                      onClick={() => setFoodModalTab("quick")}
                      style={{ flex: 1, height: 38, fontSize: 12 }}
                    >
                      ⚡ Quick Foods
                    </button>
                    <button
                      type="button"
                      className={foodModalTab === "usda" ? "btn btn-small" : "btn btn-light btn-small"}
                      onClick={() => setFoodModalTab("usda")}
                      style={{ flex: 1, height: 38, fontSize: 12 }}
                    >
                      🏛️ USDA Database
                    </button>
                    <button
                      type="button"
                      className={foodModalTab === "describe" ? "btn btn-small" : "btn btn-light btn-small"}
                      onClick={() => setFoodModalTab("describe")}
                      style={{ flex: 1, height: 38, fontSize: 12 }}
                    >
                      ✨ Describe Meal
                    </button>
                  </div>

                  {/* Tab 1: Quick Foods */}
                  {foodModalTab === "quick" && (
                    <div style={{ maxHeight: 340, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {COMMON_FOODS.map((cf) => (
                        <button
                          key={cf.id}
                          type="button"
                          onClick={() => handleLogQuickFood(cf)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: 10,
                            borderRadius: 12,
                            border: "1px solid #ECEAF2",
                            background: "#FAF9FB",
                            textAlign: "left",
                            cursor: "pointer"
                          }}
                        >
                          <span style={{ fontSize: 22 }}>{cf.emoji}</span>
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ fontSize: 12, display: "block" }}>{cf.name}</strong>
                            <span style={{ fontSize: 10, color: "#8E8896" }}>{cf.cal} kcal · {cf.p}g P</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tab 2: USDA Search */}
                  {foodModalTab === "usda" && (
                    <div>
                      <form onSubmit={handleUsdaSearch} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                        <input
                          type="text"
                          className="text-input"
                          placeholder="Search USDA (e.g., Greek yogurt, chicken breast, oats)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          style={{ height: 44, fontSize: 14 }}
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="btn"
                          disabled={isSearchingUsda || searchQuery.trim().length < 2}
                          style={{ height: 44, padding: "0 18px", fontSize: 13, flexShrink: 0 }}
                        >
                          {isSearchingUsda ? "Searching…" : "Search"}
                        </button>
                      </form>

                      {usdaError ? <p className="auth-error" style={{ marginBottom: 12 }}>{usdaError}</p> : null}

                      {isLoadingFoodDetail && (
                        <div style={{ textAlign: "center", padding: "16px 0", color: "#8E8896", fontSize: 13 }}>
                          Loading official USDA portion details…
                        </div>
                      )}

                      <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                        {usdaResults.map((food) => (
                          <div
                            key={food.sourceId}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: 12,
                              borderRadius: 14,
                              border: "1px solid #ECEAF2",
                              background: "#FAF9FB"
                            }}
                          >
                            <div style={{ flex: 1, paddingRight: 10 }}>
                              <strong style={{ fontSize: 13, display: "block" }}>{food.description}</strong>
                              <span style={{ fontSize: 11, color: "#8E8896" }}>
                                {food.foodCategory || food.dataType} {food.brandOwner ? `· ${food.brandOwner}` : ""}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-small"
                              disabled={isLoadingFoodDetail}
                              onClick={() => handleSelectUsdaFoodForPortion(food.sourceId)}
                              style={{ height: 34, padding: "0 14px", fontSize: 12, flexShrink: 0 }}
                            >
                              + Select Portion
                            </button>
                          </div>
                        ))}

                        {usdaResults.length === 0 && !isSearchingUsda && !usdaError && !isLoadingFoodDetail && (
                          <div style={{ textAlign: "center", padding: "24px 0", color: "#A8A4B0", fontSize: 13 }}>
                            Search any food or beverage to query live USDA official records.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Natural Language / Describe */}
                  {foodModalTab === "describe" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <p style={{ margin: 0, fontSize: 12, color: "#74707D" }}>
                        Type a description of your meal (e.g., &quot;2 rotis with a bowl of dal and yogurt&quot; or &quot;protein shake with banana and oats&quot;):
                      </p>
                      <textarea
                        className="text-area"
                        placeholder="e.g. 2 rotis with a bowl of yellow dal"
                        value={describeText}
                        onChange={(e) => setDescribeText(e.target.value)}
                        style={{ minHeight: 90 }}
                      />
                      <button
                        type="button"
                        className="btn"
                        disabled={!describeText.trim()}
                        onClick={handleNaturalLanguageEstimate}
                        style={{ height: 44 }}
                      >
                        + Add Described Meal
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL 2: LOG WEIGHT ===================== */}
      {modalType === "weight" && (
        <div className="modal-backdrop" onClick={() => setModalType(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ width: "min(100%, 480px)" }}>
            <div className="modal-header">
              <div>
                <h2>Log Weight Check-in</h2>
                <p>Record your latest body weight measurement.</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setModalType(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
                <button
                  type="button"
                  className={`btn btn-small ${weightModalUnit === "kg" ? "" : "btn-light"}`}
                  onClick={() => setWeightModalUnit("kg")}
                  style={{ height: 32, padding: "0 14px", fontSize: 12 }}
                >
                  kg
                </button>
                <button
                  type="button"
                  className={`btn btn-small ${weightModalUnit === "lb" ? "" : "btn-light"}`}
                  onClick={() => setWeightModalUnit("lb")}
                  style={{ height: 32, padding: "0 14px", fontSize: 12 }}
                >
                  lb
                </button>
              </div>

              <div style={{ textAlign: "center", margin: "16px 0 24px" }}>
                <span style={{ fontSize: 44, fontWeight: 800 }}>
                  {weightModalUnit === "lb" ? (weightModalVal * 2.20462).toFixed(1) : weightModalVal.toFixed(1)}
                </span>
                <span style={{ fontSize: 14, color: "#8E8896", marginLeft: 6 }}>{weightModalUnit}</span>
              </div>

              <input
                type="range"
                className="range-input"
                min={35}
                max={180}
                step={0.1}
                value={weightModalVal}
                onChange={(e) => setWeightModalVal(Number(e.target.value))}
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-light btn-small" onClick={() => setModalType(null)}>Cancel</button>
              <button
                type="button"
                className="btn btn-small"
                onClick={() => handleSaveWeight(weightModalVal)}
              >
                Save Weight
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
