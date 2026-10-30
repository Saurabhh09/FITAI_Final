import React, { useState, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  filterWeightsByTimeframe,
  generateWeightTicks,
  type WeightEntryItem,
} from "../progress-domain";

type ProgressWeightCardProps = {
  currentWeight: number;
  baselineWeight: number;
  targetWeight: number | null;
  percentOfGoal: number;
  weightEntries: WeightEntryItem[];
  onOpenLogWeight?: () => void;
};

const TIMEFRAMES: Array<"90D" | "6M" | "1Y" | "ALL"> = ["90D", "6M", "1Y", "ALL"];

export function ProgressWeightCard({
  currentWeight,
  baselineWeight,
  targetWeight,
  percentOfGoal,
  weightEntries,
  onOpenLogWeight,
}: ProgressWeightCardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<"90D" | "6M" | "1Y" | "ALL">("90D");

  const filteredEntries = useMemo(() => {
    return filterWeightsByTimeframe(weightEntries, selectedTimeframe);
  }, [weightEntries, selectedTimeframe]);

  // Determine min and max for chart bounds
  const { minWeight, maxWeight, yTicks } = useMemo(() => {
    const weights = filteredEntries.map((e) => e.weightKg);
    if (weights.length === 0) {
      weights.push(currentWeight);
    }
    const min = Math.min(...weights, targetWeight ?? currentWeight);
    const max = Math.max(...weights, targetWeight ?? currentWeight);
    // Pad by 0.5kg
    const paddedMin = Math.floor((min - 0.5) * 10) / 10;
    const paddedMax = Math.ceil((max + 0.5) * 10) / 10;
    const ticks = generateWeightTicks(paddedMin, paddedMax);
    return { minWeight: paddedMin, maxWeight: paddedMax, yTicks: ticks };
  }, [filteredEntries, currentWeight, targetWeight]);

  // Compute normalized Y position (0% to 100%) for a weight
  const getYPercent = (w: number) => {
    if (maxWeight === minWeight) return 50;
    const ratio = (w - minWeight) / (maxWeight - minWeight);
    return Math.max(0, Math.min(100, Math.round(ratio * 100)));
  };

  const currentYPercent = getYPercent(currentWeight);

  return (
    <View style={styles.card}>
      {/* 1. Header: Title + Goal Chip */}
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Weight Progress</Text>
        <Pressable
          style={({ pressed }) => [styles.goalChip, pressed && styles.pressed]}
          onPress={onOpenLogWeight}
          accessibilityRole="button"
          accessibilityLabel={`Goal progress: ${percentOfGoal}%. Tap to log weight.`}
        >
          <Text style={styles.flagIcon}>⚑</Text>
          <Text style={styles.goalChipText}>{percentOfGoal}% of goal</Text>
          <Text style={styles.editIcon}>✎</Text>
        </Pressable>
      </View>

      {/* 2. Weight Chart Area with Dashed Guide Lines */}
      <View style={styles.chartContainer}>
        {/* Y-Axis Labels + Dashed Grid lines */}
        <View style={styles.gridContainer}>
          {yTicks.map((tickVal, index) => (
            <View key={index} style={styles.gridRow}>
              <Text style={styles.yTickLabel}>{tickVal.toFixed(1)}</Text>
              <View style={styles.dashedLine} />
            </View>
          ))}
        </View>

        {/* Dynamic Weight Line representation */}
        <View style={styles.plotArea}>
          {/* Active weight horizontal indicator / trend line */}
          <View
            style={[
              styles.weightLine,
              {
                bottom: `${currentYPercent}%`,
              },
            ]}
          />
          {/* Points for recorded entries */}
          {filteredEntries.map((e, idx) => {
            const yPct = getYPercent(e.weightKg);
            const xPct =
              filteredEntries.length > 1
                ? Math.round((idx / (filteredEntries.length - 1)) * 90) + 5
                : 50;
            return (
              <View
                key={e.id}
                style={[
                  styles.dataPoint,
                  {
                    left: `${xPct}%`,
                    bottom: `${yPct}%`,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* 3. Timeframe Selector Pills */}
      <View style={styles.timeframePillBar}>
        {TIMEFRAMES.map((tf) => {
          const isSelected = selectedTimeframe === tf;
          return (
            <Pressable
              key={tf}
              onPress={() => setSelectedTimeframe(tf)}
              style={[styles.timeframePill, isSelected && styles.timeframePillActive]}
              accessibilityRole="button"
              accessibilityLabel={`Select timeframe ${tf}`}
            >
              <Text
                style={[
                  styles.timeframeText,
                  isSelected && styles.timeframeTextActive,
                ]}
              >
                {tf}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 4. Motivational Banner Pill */}
      <View style={styles.motivationalBanner}>
        <Text style={styles.motivationalText}>
          Showing up is half the battle. You&apos;re ready for this!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F0F0F2",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  goalChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pressed: {
    opacity: 0.75,
  },
  flagIcon: {
    fontSize: 12,
    color: "#4B5563",
  },
  goalChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
  },
  editIcon: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  chartContainer: {
    height: 190,
    position: "relative",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  gridContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "space-between",
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  yTickLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    width: 42,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  plotArea: {
    position: "absolute",
    top: 10,
    bottom: 10,
    left: 54,
    right: 10,
  },
  weightLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#1F2937",
    borderRadius: 2,
  },
  dataPoint: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#111827",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    marginLeft: -5,
    marginBottom: -4,
  },
  timeframePillBar: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
  },
  timeframePill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  timeframePillActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  timeframeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  timeframeTextActive: {
    fontWeight: "800",
    color: "#111827",
  },
  motivationalBanner: {
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  motivationalText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
    textAlign: "center",
  },
});
