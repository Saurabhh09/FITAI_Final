import React from "react";
import { StyleSheet, Text, View } from "react-native";

type HeroCalorieCardProps = {
  caloriesRemaining: number;
  caloriesConsumed: number;
  calorieTarget: number;
  baseTarget?: number;
  rolloverKcal?: number;
};

const CIRCLE_SIZE = 84;
const STROKE_WIDTH = 7;
const HALF_SIZE = CIRCLE_SIZE / 2;

export function HeroCalorieCard({
  caloriesRemaining,
  caloriesConsumed,
  calorieTarget,
  baseTarget,
  rolloverKcal = 0,
}: HeroCalorieCardProps) {
  const target = calorieTarget > 0 ? calorieTarget : (baseTarget || 2000);
  const ratio = Math.min(1, Math.max(0, caloriesConsumed / target));
  const percent = Math.round(ratio * 100);
  const isFull = ratio >= 1 || (caloriesRemaining <= 0 && caloriesConsumed > 0);

  // Dynamic rotation for right (0-50%) and left (50-100%) half-circle clips
  const rightRotate = ratio <= 0
    ? "-135deg"
    : ratio <= 0.5
    ? `${-135 + (ratio / 0.5) * 180}deg`
    : "45deg";

  const leftRotate = ratio <= 0.5
    ? "-135deg"
    : `${-135 + ((ratio - 0.5) / 0.5) * 180}deg`;

  const activeColor = isFull ? "#34C759" : "#111111";

  return (
    <View style={styles.card}>
      {/* Left Column: Number + Label + Rollover & Target info */}
      <View style={styles.leftCol}>
        <Text style={styles.bigNumber} numberOfLines={1}>
          {Math.max(0, caloriesRemaining).toLocaleString()}
        </Text>
        <Text style={styles.label}>
          Calories <Text style={styles.subLabel}>left</Text>
        </Text>

        {/* Rollover badge & Target Breakdown */}
        {rolloverKcal > 0 ? (
          <View style={styles.rolloverWrapper}>
            <View style={styles.rolloverBadge}>
              <Text style={styles.rolloverBadgeText}>
                ✨ +{rolloverKcal} kcal rollover
              </Text>
            </View>
            {baseTarget ? (
              <Text style={styles.targetBreakdownText}>
                Base {baseTarget.toLocaleString()} + {rolloverKcal} = {target.toLocaleString()} kcal
              </Text>
            ) : null}
          </View>
        ) : baseTarget ? (
          <Text style={styles.targetBreakdownText}>
            Goal: {baseTarget.toLocaleString()} kcal
          </Text>
        ) : null}
      </View>

      {/* Right Column: Circular Progress Gauge */}
      <View style={styles.rightCol}>
        <View style={styles.gaugeContainer}>
          {/* Background track circle */}
          <View style={styles.trackRing} />

          {/* Right half mask & arc (0% -> 50%) */}
          <View style={styles.halfContainerRight}>
            <View
              style={[
                styles.halfCircle,
                styles.halfCircleRight,
                {
                  borderColor: activeColor,
                  transform: [{ rotate: rightRotate }],
                },
              ]}
            />
          </View>

          {/* Left half mask & arc (50% -> 100%) */}
          <View style={styles.halfContainerLeft}>
            <View
              style={[
                styles.halfCircle,
                styles.halfCircleLeft,
                {
                  borderColor: activeColor,
                  transform: [{ rotate: leftRotate }],
                },
              ]}
            />
          </View>

          {/* Inner circle with flame icon */}
          <View style={styles.innerCircle}>
            <Text style={styles.flameIcon}>🔥</Text>
          </View>
        </View>

        {/* Progress percentage below circle */}
        <Text style={[styles.percentLabel, isFull && styles.percentLabelFull]}>
          {percent}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    paddingVertical: 22,
    paddingHorizontal: 22,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  leftCol: {
    flex: 1,
    justifyContent: "center",
  },
  bigNumber: {
    fontSize: 44,
    fontWeight: "900",
    color: "#111111",
    letterSpacing: -1.5,
    lineHeight: 50,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
    marginTop: 2,
  },
  subLabel: {
    fontWeight: "500",
    color: "#8E8E93",
  },
  rolloverWrapper: {
    marginTop: 8,
    alignItems: "flex-start",
  },
  rolloverBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  rolloverBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  targetBreakdownText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#8E8E93",
    marginTop: 4,
  },
  rightCol: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  gaugeContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  trackRing: {
    position: "absolute",
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: HALF_SIZE,
    borderWidth: STROKE_WIDTH,
    borderColor: "#ECEEF2",
  },
  halfContainerRight: {
    position: "absolute",
    top: 0,
    left: HALF_SIZE,
    width: HALF_SIZE,
    height: CIRCLE_SIZE,
    overflow: "hidden",
  },
  halfCircleRight: {
    left: -HALF_SIZE,
    borderLeftColor: "transparent",
    borderBottomColor: "transparent",
  },
  halfContainerLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: HALF_SIZE,
    height: CIRCLE_SIZE,
    overflow: "hidden",
  },
  halfCircleLeft: {
    left: 0,
    borderRightColor: "transparent",
    borderTopColor: "transparent",
  },
  halfCircle: {
    position: "absolute",
    top: 0,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: HALF_SIZE,
    borderWidth: STROKE_WIDTH,
  },
  innerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  flameIcon: {
    fontSize: 20,
  },
  percentLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8E8E93",
    marginTop: 6,
  },
  percentLabelFull: {
    color: "#34C759",
  },
});
