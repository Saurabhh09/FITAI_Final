import React, { useState, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  aggregateWeekMacros,
  getCalendarWeekDays,
  type DayMacroData,
} from "../progress-domain";

type ProgressDailyCaloriesCardProps = {
  dailyNutritionMap: Record<string, { calories: number; protein: number; carbs: number; fat: number }>;
  todayISO?: string;
};

const WEEK_OPTIONS = [
  { label: "This wk", offset: 0 },
  { label: "Last wk", offset: 1 },
  { label: "2 wk ago", offset: 2 },
  { label: "3 wk ago", offset: 3 },
];

export function ProgressDailyCaloriesCard({
  dailyNutritionMap,
  todayISO,
}: ProgressDailyCaloriesCardProps) {
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0);

  // Compute 7 days for current selected week
  const weekSummary = useMemo(() => {
    const weekDates = getCalendarWeekDays(selectedWeekOffset, todayISO);
    return aggregateWeekMacros(weekDates, dailyNutritionMap);
  }, [selectedWeekOffset, dailyNutritionMap, todayISO]);

  // Determine max calories for Y-axis scaling (minimum 2000 for realistic scale if low or 0)
  const maxCaloriesOnChart = useMemo(() => {
    const dailyMax = Math.max(...weekSummary.days.map((d) => d.calories), 0);
    const rounded = Math.ceil(Math.max(dailyMax, 2000) / 500) * 500;
    return rounded;
  }, [weekSummary]);

  const yTicks = useMemo(() => {
    const step = maxCaloriesOnChart / 4;
    return [
      maxCaloriesOnChart,
      Math.round(step * 3),
      Math.round(step * 2),
      Math.round(step * 1),
      0,
    ];
  }, [maxCaloriesOnChart]);

  return (
    <View style={styles.card}>
      {/* 1. Title */}
      <Text style={styles.cardTitle}>Daily Average Calories</Text>

      {/* 2. Big Stat: Average calories */}
      <View style={styles.averageRow}>
        <Text style={styles.averageValue}>{weekSummary.averageCalories.toLocaleString()}</Text>
        <Text style={styles.averageUnit}>cals</Text>
      </View>

      {/* 3. Stacked Bar Chart Area */}
      <View style={styles.chartContainer}>
        {/* Y-Axis Labels + Dashed Grid lines */}
        <View style={styles.gridContainer}>
          {yTicks.map((tickVal, index) => (
            <View key={index} style={styles.gridRow}>
              <Text style={styles.yTickLabel}>
                {tickVal === 0 ? "0" : tickVal >= 1000 ? `${(tickVal / 1000).toFixed(0)}k` : `${tickVal}`}
              </Text>
              <View style={styles.dashedLine} />
            </View>
          ))}
        </View>

        {/* 7 Columns for Sun through Sat */}
        <View style={styles.barsContainer}>
          {weekSummary.days.map((dayItem: DayMacroData, index: number) => {
            const totalCals = dayItem.calories;
            // Height percent capped at 100%
            const heightPct =
              maxCaloriesOnChart > 0
                ? Math.min(100, Math.round((totalCals / maxCaloriesOnChart) * 100))
                : 0;

            // Macro calorie distribution: Protein = 4 kcal/g, Carbs = 4 kcal/g, Fat = 9 kcal/g
            const proteinCals = dayItem.protein * 4;
            const carbsCals = dayItem.carbs * 4;
            const fatCals = dayItem.fat * 9;
            const sumMacroCals = proteinCals + carbsCals + fatCals;

            const proteinPct = sumMacroCals > 0 ? (proteinCals / sumMacroCals) * 100 : 33;
            const carbsPct = sumMacroCals > 0 ? (carbsCals / sumMacroCals) * 100 : 34;
            const fatPct = sumMacroCals > 0 ? (fatCals / sumMacroCals) * 100 : 33;

            return (
              <View key={dayItem.dateISO || index} style={styles.dayColumn}>
                {/* Bar slot with max height 100% */}
                <View style={styles.barSlot}>
                  {totalCals > 0 ? (
                    <View style={[styles.stackedBar, { height: `${Math.max(8, heightPct)}%` }]}>
                      {/* Fats (Top - Sky Blue) */}
                      <View style={[styles.barSegment, { flex: fatPct, backgroundColor: "#38BDF8" }]} />
                      {/* Carbs (Middle - Amber) */}
                      <View style={[styles.barSegment, { flex: carbsPct, backgroundColor: "#F59E0B" }]} />
                      {/* Protein (Bottom - Coral Red) */}
                      <View style={[styles.barSegment, { flex: proteinPct, backgroundColor: "#F87171" }]} />
                    </View>
                  ) : (
                    <View style={styles.emptyBarPlaceholder} />
                  )}
                </View>

                {/* Day label */}
                <Text style={styles.dayLabel}>{dayItem.dayShort}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 4. Legend Row */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>🍗</Text>
          <Text style={styles.legendText}>Protein</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>🌾</Text>
          <Text style={styles.legendText}>Carbs</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>🥑</Text>
          <Text style={styles.legendText}>Fats</Text>
        </View>
      </View>

      {/* 5. Week Selector Pills */}
      <View style={styles.timeframeRow}>
        {WEEK_OPTIONS.map((opt) => {
          const isActive = selectedWeekOffset === opt.offset;
          return (
            <Pressable
              key={opt.offset}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => setSelectedWeekOffset(opt.offset)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`View ${opt.label}`}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  averageRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 8,
    marginBottom: 16,
  },
  averageValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  averageUnit: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    marginLeft: 6,
  },
  chartContainer: {
    height: 180,
    position: "relative",
    justifyContent: "flex-end",
  },
  gridContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 24, // Space for day labels
    justifyContent: "space-between",
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  yTickLabel: {
    width: 32,
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
    textAlign: "right",
    marginRight: 8,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  barsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingLeft: 40,
    paddingRight: 8,
    height: "100%",
  },
  dayColumn: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  barSlot: {
    flex: 1,
    width: 18,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 6,
  },
  stackedBar: {
    width: 14,
    borderRadius: 7,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
  },
  barSegment: {
    width: "100%",
  },
  emptyBarPlaceholder: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
    marginBottom: 4,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
    height: 18,
    textAlign: "center",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    marginTop: 18,
    paddingVertical: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendIcon: {
    fontSize: 14,
  },
  legendText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  timeframeRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 4,
    marginTop: 18,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  pillActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  pillTextActive: {
    color: "#0F172A",
    fontWeight: "700",
  },
});
