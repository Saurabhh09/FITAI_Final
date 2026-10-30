import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/auth-context";
import { useNutritionDashboard } from "./use-nutrition-dashboard";
import { HomeHeader } from "./components/home-header";
import { WeeklyCalendarStrip } from "./components/weekly-calendar-strip";
import { HeroCalorieCard } from "./components/hero-calorie-card";
import { MacroPillRow } from "./components/macro-pill-row";
import { RecentlyUploadedSection } from "./components/recently-uploaded-section";
import { FloatingAddButton } from "./components/floating-add-button";
import { AddFoodModal } from "../food-logging/add-food-modal";
import { deleteMealItemApi } from "../food-logging/food-api";
import type { MealTypeDisplay } from "../food-logging/food-domain";
import { WaterModal } from "../tracking/water-modal";
import { WeightModal } from "../tracking/weight-modal";
import { MilestonesModal } from "../milestones/milestones-modal";
import { RingColorsModal } from "./components/ring-colors-modal";

type DashboardScreenProps = {
  showFloatingButton?: boolean;
};

export function DashboardScreen({ showFloatingButton = true }: DashboardScreenProps = {}) {
  const { session } = useAuth();
  const {
    loading,
    refreshing,
    error,
    data,
    selectedDate,
    setSelectedDate,
    refetch,
  } = useNutritionDashboard();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalMealType, setAddModalMealType] = useState<MealTypeDisplay>("Breakfast");
  const [isDeletingItemId, setIsDeletingItemId] = useState<string | null>(null);

  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [isMilestonesOpen, setIsMilestonesOpen] = useState(false);
  const [isRingColorsOpen, setIsRingColorsOpen] = useState(false);

  async function handleDeleteItem(itemId: string) {
    setIsDeletingItemId(itemId);
    try {
      const res = await deleteMealItemApi(itemId, session?.access_token);
      if (res.ok) {
        await refetch();
      } else {
        Alert.alert("Remove Meal", res.error || "Could not remove this meal.");
      }
    } finally {
      setIsDeletingItemId(null);
    }
  }

  function handleOpenAddFood(mealType: MealTypeDisplay) {
    setAddModalMealType(mealType);
    setIsAddModalOpen(true);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* 1. Header with Brand & Streak */}
      <HomeHeader
        streak={data?.streakData?.currentStreak ?? 0}
        onPressStreak={() => setIsMilestonesOpen(true)}
      />

      {/* 2. Weekly Horizontal Calendar Strip */}
      <WeeklyCalendarStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        daySummaries={data?.weekDaySummaries}
        onOpenRingColorsModal={() => setIsRingColorsOpen(true)}
      />

      {/* 3. Main Scrollable Content */}
      {loading && !data ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#111111" />
          <Text style={styles.loadingText}>Loading your nutrition...</Text>
        </View>
      ) : error && !data ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Could not load nutrition data</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Tap to Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => refetch()}
              tintColor="#111111"
              colors={["#111111"]}
            />
          }
        >
          {data && (
            <>
              {/* Hero Calorie Card */}
              <HeroCalorieCard
                caloriesRemaining={data.caloriesRemaining}
                caloriesConsumed={data.consumedTotals.calories}
                calorieTarget={data.availableCalories}
                baseTarget={data.profile.targetCalories}
                rolloverKcal={data.rolloverKcal}
              />

              {/* 3 Macro Cards (Protein, Carbs, Fats) */}
              <MacroPillRow
                proteinTarget={data.profile.targetProteinGrams || 120}
                proteinConsumed={data.consumedTotals.protein || 0}
                carbsTarget={data.profile.targetCarbsGrams || 250}
                carbsConsumed={data.consumedTotals.carbs || 0}
                fatTarget={data.profile.targetFatGrams || 65}
                fatConsumed={data.consumedTotals.fat || 0}
              />

              {/* Recently Uploaded Meals Feed */}
              <RecentlyUploadedSection
                mealBuckets={data.mealBuckets}
                allMealItems={data.allMealItems}
                onAddFood={handleOpenAddFood}
                onDeleteItem={handleDeleteItem}
                isDeletingItemId={isDeletingItemId}
              />
            </>
          )}
        </ScrollView>
      )}

      {/* 4. Floating Action Button (+) */}
      {showFloatingButton && (
        <FloatingAddButton onPress={() => handleOpenAddFood("Breakfast")} />
      )}

      {/* 5. Food Logging Modal */}
      <AddFoodModal
        visible={isAddModalOpen}
        initialMealType={addModalMealType}
        selectedDate={selectedDate}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          refetch();
        }}
      />

      {/* 6. Water Logging Modal */}
      <WaterModal
        visible={isWaterModalOpen}
        onClose={() => setIsWaterModalOpen(false)}
        onSuccess={refetch}
        selectedDate={selectedDate}
        currentConsumedMl={data?.waterMl || 0}
        targetWaterMl={data?.profile.targetWaterMl || 2500}
      />

      {/* 7. Weight Logging Modal */}
      <WeightModal
        visible={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        onSuccess={refetch}
        latestWeightKg={data?.latestWeightKg ?? null}
        baselineWeightKg={data?.profile.weightKg || 70}
        targetWeightKg={data?.profile.targetWeightKg ?? null}
      />

      {/* 8. Milestones Floating Page/Modal */}
      <MilestonesModal
        visible={isMilestonesOpen}
        onClose={() => setIsMilestonesOpen(false)}
        stats={{
          currentStreak: data?.streakData?.currentStreak ?? 0,
          longestStreak: data?.streakData?.longestStreak ?? 0,
          totalMealsLogged: data?.streakData?.totalMealsLogged ?? 0,
          totalDaysLogged: data?.streakData?.totalDaysLogged ?? 0,
          waterMl: data?.waterMl || 0,
          weightKg: data?.latestWeightKg ?? data?.profile?.weightKg ?? null,
        }}
      />

      {/* 9. Ring Colors Explained Modal */}
      <RingColorsModal
        visible={isRingColorsOpen}
        onClose={() => setIsRingColorsOpen(false)}
        streak={data?.streakData?.currentStreak ?? 0}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "500",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 6,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#111111",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
