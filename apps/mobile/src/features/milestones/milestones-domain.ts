export type MilestoneBadge = {
  id: string;
  title: string;
  requirement: string;
  category: "streak" | "meal" | "nutrition" | "consistency";
  badgeNumberText: string;
  targetValue: number;
  currentValue: number;
  isUnlocked: boolean;
};

export type MilestoneStatsInput = {
  currentStreak: number;
  longestStreak: number;
  totalMealsLogged: number;
  totalDaysLogged: number;
  waterMl?: number;
  weightKg?: number | null;
};

export function computeMilestoneBadges(stats: MilestoneStatsInput): {
  badges: MilestoneBadge[];
  unlockedCount: number;
  totalCount: number;
  progressPercent: number;
} {
  const effectiveStreak = Math.max(stats.currentStreak, stats.longestStreak);
  const meals = stats.totalMealsLogged;
  const days = stats.totalDaysLogged;
  const hasWater = (stats.waterMl || 0) > 0;
  const hasWeight = stats.weightKg !== null && stats.weightKg !== undefined && stats.weightKg > 0;

  const rawBadges: Array<Omit<MilestoneBadge, "currentValue" | "isUnlocked"> & {
    evaluator: () => { currentValue: number; isUnlocked: boolean };
  }> = [
    // Streak Milestones (Row 1 & 2 in Image 1)
    {
      id: "rookie",
      title: "Rookie",
      requirement: "3 day streak",
      category: "streak",
      badgeNumberText: "3\nSTREAK",
      targetValue: 3,
      evaluator: () => ({ currentValue: effectiveStreak, isUnlocked: effectiveStreak >= 3 }),
    },
    {
      id: "getting_serious",
      title: "Getting Serious",
      requirement: "10 day streak",
      category: "streak",
      badgeNumberText: "10\nSTREAK",
      targetValue: 10,
      evaluator: () => ({ currentValue: effectiveStreak, isUnlocked: effectiveStreak >= 10 }),
    },
    {
      id: "locked_in",
      title: "Locked In",
      requirement: "50 day streak",
      category: "streak",
      badgeNumberText: "50\nSTREAK",
      targetValue: 50,
      evaluator: () => ({ currentValue: effectiveStreak, isUnlocked: effectiveStreak >= 50 }),
    },
    {
      id: "triple_threat",
      title: "Triple Threat",
      requirement: "100 day streak",
      category: "streak",
      badgeNumberText: "100\nSTREAK",
      targetValue: 100,
      evaluator: () => ({ currentValue: effectiveStreak, isUnlocked: effectiveStreak >= 100 }),
    },
    {
      id: "no_days_off",
      title: "No Days Off",
      requirement: "365 day streak",
      category: "streak",
      badgeNumberText: "365\nSTREAK",
      targetValue: 365,
      evaluator: () => ({ currentValue: effectiveStreak, isUnlocked: effectiveStreak >= 365 }),
    },
    {
      id: "immortal",
      title: "Immortal",
      requirement: "1000 day streak",
      category: "streak",
      badgeNumberText: "1000\nSTREAK",
      targetValue: 1000,
      evaluator: () => ({ currentValue: effectiveStreak, isUnlocked: effectiveStreak >= 1000 }),
    },
    {
      id: "day_one",
      title: "Day One",
      requirement: "1 day streak",
      category: "streak",
      badgeNumberText: "1\nSTREAK",
      targetValue: 1,
      evaluator: () => ({ currentValue: effectiveStreak, isUnlocked: effectiveStreak >= 1 }),
    },
    {
      id: "week_warrior",
      title: "Week Strong",
      requirement: "7 day streak",
      category: "streak",
      badgeNumberText: "7\nSTREAK",
      targetValue: 7,
      evaluator: () => ({ currentValue: effectiveStreak, isUnlocked: effectiveStreak >= 7 }),
    },
    {
      id: "fortnight",
      title: "Fortnight",
      requirement: "14 day streak",
      category: "streak",
      badgeNumberText: "14\nSTREAK",
      targetValue: 14,
      evaluator: () => ({ currentValue: effectiveStreak, isUnlocked: effectiveStreak >= 14 }),
    },
    {
      id: "monthly_master",
      title: "Monthly Master",
      requirement: "30 day streak",
      category: "streak",
      badgeNumberText: "30\nSTREAK",
      targetValue: 30,
      evaluator: () => ({ currentValue: effectiveStreak, isUnlocked: effectiveStreak >= 30 }),
    },

    // Meal Logging Milestones (Matching circular icons in Image 1)
    {
      id: "first_bite",
      title: "First Bite",
      requirement: "1 meal logged",
      category: "meal",
      badgeNumberText: "1",
      targetValue: 1,
      evaluator: () => ({ currentValue: meals, isUnlocked: meals >= 1 }),
    },
    {
      id: "high_five",
      title: "High Five",
      requirement: "5 meals logged",
      category: "meal",
      badgeNumberText: "5",
      targetValue: 5,
      evaluator: () => ({ currentValue: meals, isUnlocked: meals >= 5 }),
    },
    {
      id: "ten_down",
      title: "Ten Down",
      requirement: "10 meals logged",
      category: "meal",
      badgeNumberText: "10",
      targetValue: 10,
      evaluator: () => ({ currentValue: meals, isUnlocked: meals >= 10 }),
    },
    {
      id: "plate_pro",
      title: "Plate Pro",
      requirement: "25 meals logged",
      category: "meal",
      badgeNumberText: "25",
      targetValue: 25,
      evaluator: () => ({ currentValue: meals, isUnlocked: meals >= 25 }),
    },
    {
      id: "half_century",
      title: "Half Century",
      requirement: "50 meals logged",
      category: "meal",
      badgeNumberText: "50",
      targetValue: 50,
      evaluator: () => ({ currentValue: meals, isUnlocked: meals >= 50 }),
    },
    {
      id: "century_club",
      title: "Century Club",
      requirement: "100 meals logged",
      category: "meal",
      badgeNumberText: "100",
      targetValue: 100,
      evaluator: () => ({ currentValue: meals, isUnlocked: meals >= 100 }),
    },
    {
      id: "double_century",
      title: "200 Club",
      requirement: "200 meals logged",
      category: "meal",
      badgeNumberText: "200",
      targetValue: 200,
      evaluator: () => ({ currentValue: meals, isUnlocked: meals >= 200 }),
    },
    {
      id: "feast_master",
      title: "Feast Master",
      requirement: "500 meals logged",
      category: "meal",
      badgeNumberText: "500",
      targetValue: 500,
      evaluator: () => ({ currentValue: meals, isUnlocked: meals >= 500 }),
    },
    {
      id: "culinary_legend",
      title: "Culinary Legend",
      requirement: "1000 meals logged",
      category: "meal",
      badgeNumberText: "1000",
      targetValue: 1000,
      evaluator: () => ({ currentValue: meals, isUnlocked: meals >= 1000 }),
    },
    {
      id: "flavor_founder",
      title: "Flavor Founder",
      requirement: "2500 meals logged",
      category: "meal",
      badgeNumberText: "2500",
      targetValue: 2500,
      evaluator: () => ({ currentValue: meals, isUnlocked: meals >= 2500 }),
    },

    // Nutrition & Consistency Milestones
    {
      id: "bullseye",
      title: "Bullseye",
      requirement: "Hit calorie goal",
      category: "nutrition",
      badgeNumberText: "🎯",
      targetValue: 1,
      evaluator: () => ({ currentValue: days > 0 ? 1 : 0, isUnlocked: days > 0 }),
    },
    {
      id: "macro_match",
      title: "Macro Match",
      requirement: "Balance your protein target",
      category: "nutrition",
      badgeNumberText: "⚖️",
      targetValue: 1,
      evaluator: () => ({ currentValue: meals >= 3 ? 1 : 0, isUnlocked: meals >= 3 }),
    },
    {
      id: "green_streak",
      title: "Green Machine",
      requirement: "3 days on target",
      category: "nutrition",
      badgeNumberText: "🟢",
      targetValue: 3,
      evaluator: () => ({ currentValue: Math.min(days, 3), isUnlocked: days >= 3 }),
    },
    {
      id: "perfect_week",
      title: "Perfect Week",
      requirement: "7 days on target",
      category: "nutrition",
      badgeNumberText: "⭐",
      targetValue: 7,
      evaluator: () => ({ currentValue: Math.min(days, 7), isUnlocked: days >= 7 }),
    },
    {
      id: "early_bird",
      title: "Early Bird",
      requirement: "Logged breakfast",
      category: "consistency",
      badgeNumberText: "🌅",
      targetValue: 1,
      evaluator: () => ({ currentValue: meals >= 1 ? 1 : 0, isUnlocked: meals >= 1 }),
    },
    {
      id: "night_owl",
      title: "Mindful Dinner",
      requirement: "Logged evening meal",
      category: "consistency",
      badgeNumberText: "🌙",
      targetValue: 1,
      evaluator: () => ({ currentValue: meals >= 2 ? 1 : 0, isUnlocked: meals >= 2 }),
    },
    {
      id: "hydration_hero",
      title: "Hydration Hero",
      requirement: "Logged daily water intake",
      category: "consistency",
      badgeNumberText: "💧",
      targetValue: 1,
      evaluator: () => ({ currentValue: hasWater ? 1 : 0, isUnlocked: hasWater }),
    },
    {
      id: "scale_stepper",
      title: "Scale Stepper",
      requirement: "Recorded weight check-in",
      category: "consistency",
      badgeNumberText: "⚖️",
      targetValue: 1,
      evaluator: () => ({ currentValue: hasWeight ? 1 : 0, isUnlocked: hasWeight }),
    },
    {
      id: "ai_visionary",
      title: "AI Visionary",
      requirement: "Scanned meal with camera",
      category: "consistency",
      badgeNumberText: "📸",
      targetValue: 1,
      evaluator: () => ({ currentValue: meals >= 1 ? 1 : 0, isUnlocked: meals >= 1 }),
    },
    {
      id: "clean_slate",
      title: "Clean Slate",
      requirement: "Logged 3 meals in a day",
      category: "consistency",
      badgeNumberText: "🍽️",
      targetValue: 3,
      evaluator: () => ({ currentValue: Math.min(meals, 3), isUnlocked: meals >= 3 }),
    },
  ];

  const badges: MilestoneBadge[] = rawBadges.map((b) => {
    const { currentValue, isUnlocked } = b.evaluator();
    return {
      id: b.id,
      title: b.title,
      requirement: b.requirement,
      category: b.category,
      badgeNumberText: b.badgeNumberText,
      targetValue: b.targetValue,
      currentValue,
      isUnlocked,
    };
  });

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const totalCount = badges.length;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return {
    badges,
    unlockedCount,
    totalCount,
    progressPercent,
  };
}
