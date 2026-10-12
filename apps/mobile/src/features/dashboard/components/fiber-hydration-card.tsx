import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type FiberHydrationCardProps = {
  consumedFiber: number;
  targetFiber: number;
  consumedWaterMl: number;
  targetWaterMl: number;
  onLogWater?: () => void;
};

export function FiberHydrationCard({
  consumedFiber,
  targetFiber,
  consumedWaterMl,
  targetWaterMl,
  onLogWater,
}: FiberHydrationCardProps) {
  const fiberPercent = targetFiber > 0
    ? Math.min(100, Math.round((consumedFiber / targetFiber) * 100))
    : 0;

  const waterLiters = Math.round((consumedWaterMl / 1000) * 10) / 10;
  const targetLiters = Math.round((targetWaterMl / 1000) * 10) / 10;
  const waterPercent = targetWaterMl > 0
    ? Math.min(100, Math.round((consumedWaterMl / targetWaterMl) * 100))
    : 0;
  const isWaterGoalMet = targetWaterMl > 0 && consumedWaterMl >= targetWaterMl;

  return (
    <View style={styles.container}>
      {/* Fiber Card */}
      <View style={styles.card} accessibilityLabel={`Fiber: ${consumedFiber} of ${targetFiber} grams`}>
        <View style={styles.header}>
          <Text style={styles.icon}>🥗</Text>
          <Text style={styles.title}>FIBER</Text>
        </View>

        <View style={styles.valueRow}>
          <Text style={styles.valueLarge}>{consumedFiber}g</Text>
          <Text style={styles.valueSub}>/ {targetFiber}g</Text>
        </View>

        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${fiberPercent}%`, backgroundColor: "#78B887" }]} />
        </View>
        <Text style={styles.percentText}>{fiberPercent}% of target</Text>
      </View>

      {/* Hydration Card */}
      <Pressable
        onPress={onLogWater}
        disabled={!onLogWater}
        style={({ pressed }) => [
          styles.card,
          onLogWater && pressed && styles.cardPressed,
        ]}
        accessibilityRole={onLogWater ? "button" : undefined}
        accessibilityLabel={`Water: ${waterLiters} of ${targetLiters} liters. Tap to log water.`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.headerBetween}>
          <View style={styles.headerLeft}>
            <Text style={styles.icon}>💧</Text>
            <Text style={styles.title}>HYDRATION</Text>
          </View>
          {onLogWater ? (
            <View style={styles.addBadge}>
              <Text style={styles.addBadgeText}>+ Add</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.valueRow}>
          <Text style={styles.valueLarge}>{waterLiters}L</Text>
          <Text style={styles.valueSub}>/ {targetLiters}L</Text>
        </View>

        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${waterPercent}%`,
                backgroundColor: isWaterGoalMet ? "#78B887" : "#739BCB",
              },
            ]}
          />
        </View>
        <Text style={styles.percentText}>
          {consumedWaterMl} / {targetWaterMl} ml
          {isWaterGoalMet ? " (Goal met!)" : ""}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EAE9ED",
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  icon: {
    fontSize: 14,
  },
  title: {
    color: "#85838A",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  valueLarge: {
    color: "#211F25",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  valueSub: {
    color: "#A09DA5",
    fontSize: 12,
    fontWeight: "600",
  },
  progressBg: {
    height: 6,
    backgroundColor: "#F4F3F7",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  percentText: {
    color: "#85838A",
    fontSize: 11,
    fontWeight: "500",
  },
  headerBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addBadge: {
    backgroundColor: "#F4F3F7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EAE9ED",
  },
  addBadgeText: {
    color: "#211F25",
    fontSize: 10,
    fontWeight: "700",
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
});
