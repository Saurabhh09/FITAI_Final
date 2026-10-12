import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/auth-context";
import { CalorieCard } from "./components/calorie-card";
import { DashboardHeader } from "./components/dashboard-header";
import { FiberHydrationCard } from "./components/fiber-hydration-card";
import { MacroCards } from "./components/macro-cards";
import { MealList } from "./components/meal-list";
import { WeightCard } from "./components/weight-card";
import { useNutritionDashboard } from "./use-nutrition-dashboard";
import { AddFoodModal } from "../food-logging/add-food-modal";
import { deleteMealItemApi } from "../food-logging/food-api";
import type { MealTypeDisplay } from "../food-logging/food-domain";
import { WaterModal } from "../tracking/water-modal";
import { WeightModal } from "../tracking/weight-modal";

export function DashboardScreen() {
  const { session, signOut } = useAuth();
  const {
    loading,
    refreshing,
    error,
    data,
    selectedDate,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    refetch,
  } = useNutritionDashboard();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalMealType, setAddModalMealType] = useState<MealTypeDisplay>("Breakfast");
  const [isDeletingItemId, setIsDeletingItemId] = useState<string | null>(null);

  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);

  async function handleDeleteItem(itemId: string) {
    if (!session?.access_token) return;
    setIsDeletingItemId(itemId);
    const res = await deleteMealItemApi(itemId, session.access_token);
    setIsDeletingItemId(null);
    if (res.ok) {
      refetch();
    }
  }

  function handleOpenAddFood(mealType: MealTypeDisplay) {
    setAddModalMealType(mealType);
    setIsAddModalOpen(true);
  }

  function handleAddSuccess() {
    setIsAddModalOpen(false);
    refetch();
  }

  function handleWaterSuccess() {
    setIsWaterModalOpen(false);
    refetch();
  }

  function handleWeightSuccess() {
    setIsWeightModalOpen(false);
    refetch();
  }

  // 1. Initial Loading State
  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#211F25" />
          <Text style={styles.loadingText}>Loading nutrition targets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Query Error State
  if (error && !data) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.centeredContainer}>
          <View style={styles.errorCard} accessibilityRole="alert">
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Could not load dashboard</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading dashboard"
              onPress={refetch}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const {
    profile,
    mealBuckets,
    allMealItems,
    consumedTotals,
    waterMl,
    rolloverKcal,
    availableCalories,
    caloriesRemaining,
  } = data;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refetch}
            tintColor="#211F25"
            colors={["#211F25"]}
          />
        }
      >
        {/* Header with date navigation */}
        <DashboardHeader
          displayName={profile.displayName}
          selectedDate={selectedDate}
          onPreviousDay={goToPreviousDay}
          onNextDay={goToNextDay}
          onToday={goToToday}
          onSignOut={signOut}
        />

        {/* Hero Calorie Card */}
        <CalorieCard
          baseTargetCalories={profile.targetCalories}
          consumedCalories={consumedTotals.calories}
          rolloverKcal={rolloverKcal}
          availableCalories={availableCalories}
          caloriesRemaining={caloriesRemaining}
        />

        {/* Macronutrient Cards */}
        <MacroCards
          consumedProtein={consumedTotals.protein}
          targetProtein={profile.targetProteinGrams}
          consumedCarbs={consumedTotals.carbs}
          targetCarbs={profile.targetCarbsGrams}
          consumedFat={consumedTotals.fat}
          targetFat={profile.targetFatGrams}
        />

        {/* Fiber & Hydration */}
        <FiberHydrationCard
          consumedFiber={consumedTotals.fiber}
          targetFiber={profile.targetFiberGrams}
          consumedWaterMl={waterMl}
          targetWaterMl={profile.targetWaterMl}
          onLogWater={() => setIsWaterModalOpen(true)}
        />

        {/* Body Weight Tracking */}
        <WeightCard
          latestWeightKg={data.latestWeightKg}
          latestWeightDate={data.latestWeightDate}
          baselineWeightKg={profile.weightKg}
          targetWeightKg={profile.targetWeightKg}
          onLogWeight={() => setIsWeightModalOpen(true)}
        />

        {/* Meal Items and Buckets */}
        <MealList
          mealBuckets={mealBuckets}
          totalMealsCount={allMealItems.length}
          onAddFood={handleOpenAddFood}
          onDeleteFood={handleDeleteItem}
          isDeletingId={isDeletingItemId}
        />

        {/* Phase status indicator */}
        <View style={styles.footerNotice}>
          <Text style={styles.footerTitle}>Priority 3B-4 Mobile Water & Weight Tracking Active</Text>
          <Text style={styles.footerBody}>
            Authoritative Supabase nutrition, meal logging, hydration logs, and weight entries are synchronized in real time.
          </Text>
        </View>
      </ScrollView>

      {/* Add Food Modal */}
      <AddFoodModal
        visible={isAddModalOpen}
        selectedDate={selectedDate}
        initialMealType={addModalMealType}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Water Logging Modal */}
      <WaterModal
        visible={isWaterModalOpen}
        selectedDate={selectedDate}
        currentConsumedMl={waterMl}
        targetWaterMl={profile.targetWaterMl}
        onClose={() => setIsWaterModalOpen(false)}
        onSuccess={handleWaterSuccess}
      />

      {/* Weight Logging Modal */}
      <WeightModal
        visible={isWeightModalOpen}
        latestWeightKg={data.latestWeightKg}
        baselineWeightKg={profile.weightKg}
        targetWeightKg={profile.targetWeightKg}
        onClose={() => setIsWeightModalOpen(false)}
        onSuccess={handleWeightSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F7FB",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 20,
  },
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  loadingText: {
    color: "#77747C",
    fontSize: 14,
    fontWeight: "500",
  },
  errorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#FBD5D5",
    alignItems: "center",
    gap: 10,
    width: "100%",
    maxWidth: 340,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  errorTitle: {
    color: "#9B1C1C",
    fontSize: 17,
    fontWeight: "700",
  },
  errorBody: {
    color: "#77747C",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#211F25",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  footerNotice: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAE9ED",
    gap: 4,
    marginTop: 4,
  },
  footerTitle: {
    color: "#211F25",
    fontSize: 12,
    fontWeight: "700",
  },
  footerBody: {
    color: "#85838A",
    fontSize: 11,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.8,
  },
});
