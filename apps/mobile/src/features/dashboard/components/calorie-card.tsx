import React from "react";
import { StyleSheet, Text, View } from "react-native";

type CalorieCardProps = {
  baseTargetCalories: number;
  consumedCalories: number;
  rolloverKcal: number;
  availableCalories: number;
  caloriesRemaining: number;
};

export function CalorieCard({
  baseTargetCalories,
  consumedCalories,
  rolloverKcal,
  availableCalories,
  caloriesRemaining,
}: CalorieCardProps) {
  const isOverBudget = availableCalories > 0 && consumedCalories > availableCalories;
  const overKcal = isOverBudget ? consumedCalories - availableCalories : 0;
  const percent = availableCalories > 0
    ? Math.min(100, Math.round((consumedCalories / availableCalories) * 100))
    : 0;

  return (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={
        isOverBudget
          ? `Calorie budget: Over budget by ${overKcal} calories. ${consumedCalories} of ${availableCalories} kcal consumed.`
          : `Calorie budget: ${caloriesRemaining} calories remaining. ${consumedCalories} of ${availableCalories} kcal consumed.`
      }
    >
      {/* Top Tag & Rollover / Over-budget Badge */}
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>CALORIE BUDGET</Text>
        <View style={styles.badgesRow}>
          {isOverBudget && (
            <View style={styles.overBudgetBadge}>
              <Text style={styles.overBudgetText}>+{overKcal} kcal over</Text>
            </View>
          )}
          {rolloverKcal > 0 && (
            <View style={styles.rolloverBadge}>
              <Text style={styles.rolloverText}>+{rolloverKcal} kcal rollover</Text>
            </View>
          )}
        </View>
      </View>

      {/* Hero Remaining Number */}
      <View style={styles.heroRow}>
        <View>
          <Text style={[styles.heroNumber, isOverBudget && styles.heroNumberOver]}>
            {isOverBudget ? `+${overKcal}` : caloriesRemaining}
          </Text>
          <Text style={styles.heroLabel}>
            {isOverBudget ? "kcal over daily budget" : "calories remaining"}
          </Text>
        </View>

        <View style={styles.ringMeta}>
          <Text style={[styles.percentText, isOverBudget && styles.percentTextOver]}>{percent}%</Text>
          <Text style={styles.percentSub}>{isOverBudget ? "budget exceeded" : "consumed"}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View
        style={styles.progressBarBg}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: availableCalories, now: consumedCalories }}
      >
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${percent}%`,
              backgroundColor: isOverBudget ? "#D76891" : "#211F25",
            },
          ]}
        />
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Consumed</Text>
          <Text style={styles.metricValue}>{consumedCalories} kcal</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Base Target</Text>
          <Text style={styles.metricValue}>{baseTargetCalories} kcal</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Daily Available</Text>
          <Text style={styles.metricValue}>{availableCalories} kcal</Text>
        </View>
      </View>

      {/* Rollover explainer if active */}
      {rolloverKcal > 0 && (
        <View style={styles.rolloverNotice}>
          <Text style={styles.rolloverNoticeText}>
            💡 Base plan is {baseTargetCalories} kcal. Unused budget of {rolloverKcal} kcal from yesterday was added for today.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EAE9ED",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: "#85838A",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  overBudgetBadge: {
    backgroundColor: "#FDF2F4",
    borderColor: "#F7D6DE",
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  overBudgetText: {
    color: "#BE5E64",
    fontSize: 11,
    fontWeight: "700",
  },
  rolloverBadge: {
    backgroundColor: "#FFF5EF",
    borderColor: "#F6E7DE",
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  rolloverText: {
    color: "#C66E45",
    fontSize: 11,
    fontWeight: "700",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  heroNumber: {
    color: "#211F25",
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -2,
    lineHeight: 48,
  },
  heroNumberOver: {
    color: "#BE5E64",
  },
  percentTextOver: {
    color: "#BE5E64",
  },
  heroLabel: {
    color: "#77747C",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  ringMeta: {
    alignItems: "flex-end",
  },
  percentText: {
    color: "#211F25",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  percentSub: {
    color: "#85838A",
    fontSize: 11,
    fontWeight: "500",
  },
  progressBarBg: {
    height: 10,
    backgroundColor: "#F4F3F7",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#211F25",
    borderRadius: 5,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: "#EAE9ED",
  },
  metricLabel: {
    color: "#85838A",
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
  },
  metricValue: {
    color: "#211F25",
    fontSize: 13,
    fontWeight: "700",
  },
  rolloverNotice: {
    backgroundColor: "#FAFAFC",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#EAE9ED",
  },
  rolloverNoticeText: {
    color: "#77747C",
    fontSize: 11,
    lineHeight: 16,
  },
});
