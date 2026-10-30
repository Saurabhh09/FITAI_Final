import React, { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MilestonesModal } from "../milestones/milestones-modal";
import { WeightModal } from "../tracking/weight-modal";
import { ProgressBMICard } from "./components/progress-bmi-card";
import { ProgressDailyCaloriesCard } from "./components/progress-daily-calories-card";
import { ProgressExpenditureCard } from "./components/progress-expenditure-card";
import { ProgressStreakBadgesCard } from "./components/progress-streak-badges-card";
import { ProgressWeeklyEnergyCard } from "./components/progress-weekly-energy-card";
import { ProgressWeightCard } from "./components/progress-weight-card";
import { useProgress } from "./use-progress";

export function ProgressScreen() {
  const { data, loading, refreshing, error, refetch } = useProgress();

  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [isMilestonesModalOpen, setIsMilestonesModalOpen] = useState(false);

  // Fallback defaults for clean rendering when loading or empty
  const streak = data?.currentStreak || 0;
  const badgesCount = data?.unlockedBadgesCount || 0;
  const weekLogged = data?.currentWeekLoggedDays || {};
  const currentWeight = data?.currentWeight || 60;
  const baselineWeight = data?.baselineWeight || 60;
  const targetWeight = data?.targetWeight ?? null;
  const percentOfGoal = data?.weightGoalProgressPercent || 0;
  const weightEntries = data?.weightEntries || [];
  const dailyNutrition = data?.dailyNutritionMap || {};
  const targetCalories = data?.targetCalories || 2000;
  const expenditureChanges = data?.expenditureChanges || [];
  const bmiData = data?.bmiData || {
    bmi: 21.5,
    category: "healthy",
    categoryLabel: "Healthy",
    categoryColor: "#16A34A",
    categoryBgColor: "#DCFCE7",
    percentPosition: 35,
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refetch}
            tintColor="#0F172A"
            colors={["#0F172A"]}
          />
        }
      >
        {/* Top Header */}
        <Text style={styles.pageTitle}>Progress</Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading && !refreshing && !data ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={styles.loadingText}>Loading progress analytics...</Text>
          </View>
        ) : (
          <>
            {/* 1. Day Streak & Badges Earned (Image 1 top row) */}
            <ProgressStreakBadgesCard
              currentStreak={streak}
              unlockedBadgesCount={badgesCount}
              currentWeekLoggedDays={weekLogged}
              onPressStreak={() => setIsMilestonesModalOpen(true)}
              onPressBadges={() => setIsMilestonesModalOpen(true)}
            />

            {/* 2. Weight Progress Card (Image 1 bottom) */}
            <ProgressWeightCard
              currentWeight={currentWeight}
              baselineWeight={baselineWeight}
              targetWeight={targetWeight}
              percentOfGoal={percentOfGoal}
              weightEntries={weightEntries}
              onOpenLogWeight={() => setIsWeightModalOpen(true)}
            />

            {/* 3. Daily Average Calories Card (Image 2 top) */}
            <ProgressDailyCaloriesCard
              dailyNutritionMap={dailyNutrition}
            />

            {/* 4. Weekly Energy Card (Image 2 & 3) */}
            <ProgressWeeklyEnergyCard
              dailyNutritionMap={dailyNutrition}
              targetCalories={targetCalories}
            />

            {/* 5. Expenditure Changes Card (Image 3 bottom) */}
            <ProgressExpenditureCard
              expenditureChanges={expenditureChanges}
            />

            {/* 6. Your BMI Card (Image 4) */}
            <ProgressBMICard
              bmiData={bmiData}
            />
          </>
        )}
      </ScrollView>

      {/* Weight Modal */}
      <WeightModal
        visible={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        onSuccess={refetch}
        latestWeightKg={currentWeight}
        baselineWeightKg={baselineWeight}
        targetWeightKg={targetWeight}
      />

      {/* Milestones / Streak Modal */}
      <MilestonesModal
        visible={isMilestonesModalOpen}
        onClose={() => setIsMilestonesModalOpen(false)}
        stats={{
          currentStreak: streak,
          longestStreak: data?.longestStreak || streak,
          totalMealsLogged: Object.keys(dailyNutrition).length * 2,
          totalDaysLogged: Object.keys(dailyNutrition).length || 1,
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  errorText: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "600",
  },
});
