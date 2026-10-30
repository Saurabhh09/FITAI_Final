import React, { useState, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  aggregateWeekMacros,
  calculateWeeklyEnergy,
  getCalendarWeekDays,
  type DayMacroData,
} from "../progress-domain";

type ProgressWeeklyEnergyCardProps = {
  dailyNutritionMap: Record<string, { calories: number; protein: number; carbs: number; fat: number }>;
  targetCalories: number;
  todayISO?: string;
};

const WEEK_OPTIONS = [
  { label: "This wk", offset: 0 },
  { label: "Last wk", offset: 1 },
  { label: "2 wk ago", offset: 2 },
  { label: "3 wk ago", offset: 3 },
];

export function ProgressWeeklyEnergyCard({
  dailyNutritionMap,
  targetCalories,
  todayISO,
}: ProgressWeeklyEnergyCardProps) {
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0);

  const energySummary = useMemo(() => {
    const weekDates = getCalendarWeekDays(selectedWeekOffset, todayISO);
    const macroSummary = aggregateWeekMacros(weekDates, dailyNutritionMap);
    return calculateWeeklyEnergy(macroSummary.days, targetCalories);
  }, [selectedWeekOffset, dailyNutritionMap, targetCalories, todayISO]);

  // Compute maximum value for Y-axis (default at least 4000 like in reference screenshot)
  const maxY = useMemo(() => {
    const maxVal = Math.max(
      ...energySummary.dailyConsumed,
      ...energySummary.dailyBurned,
      3500
    );
    return Math.ceil(maxVal / 1000) * 1000;
  }, [energySummary]);

  const yTicks = useMemo(() => {
    const step = maxY / 4;
    return [maxY, Math.round(step * 3), Math.round(step * 2), Math.round(step * 1), 0];
  }, [maxY]);

  return (
    <View style={styles.card}>
      {/* 1. Header Title */}
      <Text style={styles.cardTitle}>Weekly Energy</Text>

      {/* 2. 3-Column Summary Stats: Consumed, Burned, Energy */}
      <View style={styles.metricsRow}>
        {/* Consumed */}
        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>Consumed</Text>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricValue}>{energySummary.consumedCalories.toLocaleString()}</Text>
            <Text style={styles.metricUnit}>cals</Text>
          </View>
        </View>

        {/* Burned */}
        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>Burned</Text>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricValue}>{energySummary.burnedCalories.toLocaleString()}</Text>
            <Text style={styles.metricUnit}>cals</Text>
          </View>
        </View>

        {/* Energy (Net) */}
        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>Energy</Text>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricValue}>
              {energySummary.netCalories > 0 ? `+${energySummary.netCalories.toLocaleString()}` : energySummary.netCalories.toLocaleString()}
            </Text>
            <Text style={styles.metricUnit}>cals</Text>
          </View>
        </View>
      </View>

      {/* 3. Dual Bar Chart (Consumed vs Burned) */}
      <View style={styles.chartContainer}>
        {/* Y-Axis dashed guide lines */}
        <View style={styles.gridContainer}>
          {yTicks.map((tickVal, index) => (
            <View key={index} style={styles.gridRow}>
              <Text style={styles.yTickLabel}>{tickVal}</Text>
              <View style={styles.dashedLine} />
            </View>
          ))}
        </View>

        {/* 7 Columns with Dual Bars */}
        <View style={styles.barsContainer}>
          {energySummary.daysShort.map((dayShort, idx) => {
            const consumed = energySummary.dailyConsumed[idx] || 0;
            const burned = energySummary.dailyBurned[idx] || 0;

            const consumedHeightPct = maxY > 0 ? Math.min(100, Math.round((consumed / maxY) * 100)) : 0;
            const burnedHeightPct = maxY > 0 ? Math.min(100, Math.round((burned / maxY) * 100)) : 0;

            return (
              <View key={`${dayShort}-${idx}`} style={styles.dayColumn}>
                <View style={styles.dualBarsSlot}>
                  {/* Consumed Bar (Orange) */}
                  <View style={styles.barTrack}>
                    {consumed > 0 ? (
                      <View style={[styles.barFill, styles.consumedBar, { height: `${Math.max(6, consumedHeightPct)}%` }]} />
                    ) : (
                      <View style={styles.emptyDot} />
                    )}
                  </View>

                  {/* Burned Bar (Green) */}
                  <View style={styles.barTrack}>
                    {burned > 0 ? (
                      <View style={[styles.barFill, styles.burnedBar, { height: `${Math.max(6, burnedHeightPct)}%` }]} />
                    ) : (
                      <View style={styles.emptyDot} />
                    )}
                  </View>
                </View>

                {/* Day of Week Label */}
                <Text style={styles.dayLabel}>{dayShort}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 4. Legend Row */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#FB923C" }]} />
          <Text style={styles.legendText}>Consumed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#4ADE80" }]} />
          <Text style={styles.legendText}>Burned</Text>
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
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 16,
  },
  metricColumn: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 4,
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    marginLeft: 4,
  },
  chartContainer: {
    height: 190,
    position: "relative",
    justifyContent: "flex-end",
  },
  gridContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 24,
    justifyContent: "space-between",
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  yTickLabel: {
    width: 36,
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
    paddingLeft: 44,
    paddingRight: 6,
    height: "100%",
  },
  dayColumn: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  dualBarsSlot: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    paddingBottom: 6,
  },
  barTrack: {
    width: 7,
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  barFill: {
    width: 7,
    borderRadius: 3.5,
  },
  consumedBar: {
    backgroundColor: "#FB923C",
  },
  burnedBar: {
    backgroundColor: "#4ADE80",
  },
  emptyDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
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
    gap: 24,
    marginTop: 18,
    paddingVertical: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
