import React from "react";
import { StyleSheet, Text, View } from "react-native";

type MacroPillRowProps = {
  proteinTarget: number;
  proteinConsumed: number;
  carbsTarget: number;
  carbsConsumed: number;
  fatTarget: number;
  fatConsumed: number;
};

export function MacroPillRow({
  proteinTarget,
  proteinConsumed,
  carbsTarget,
  carbsConsumed,
  fatTarget,
  fatConsumed,
}: MacroPillRowProps) {
  const proteinLeft = Math.max(0, Math.round(proteinTarget - proteinConsumed));
  const carbsLeft = Math.max(0, Math.round(carbsTarget - carbsConsumed));
  const fatsLeft = Math.max(0, Math.round(fatTarget - fatConsumed));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Card 1: Protein */}
        <View style={styles.card}>
          <Text style={styles.macroValue}>{proteinLeft}g</Text>
          <Text style={styles.macroLabel}>
            Protein <Text style={styles.subLabel}>left</Text>
          </Text>
          <View style={[styles.ringContainer, { backgroundColor: "#FFF0F0" }]}>
            <View style={[styles.innerRing, { borderColor: "#FF6B6B" }]}>
              <Text style={styles.macroEmoji}>🍗</Text>
            </View>
          </View>
        </View>

        {/* Card 2: Carbs */}
        <View style={styles.card}>
          <Text style={styles.macroValue}>{carbsLeft}g</Text>
          <Text style={styles.macroLabel}>
            Carbs <Text style={styles.subLabel}>left</Text>
          </Text>
          <View style={[styles.ringContainer, { backgroundColor: "#FFF8E7" }]}>
            <View style={[styles.innerRing, { borderColor: "#FFA500" }]}>
              <Text style={styles.macroEmoji}>🌾</Text>
            </View>
          </View>
        </View>

        {/* Card 3: Fats */}
        <View style={styles.card}>
          <Text style={styles.macroValue}>{fatsLeft}g</Text>
          <Text style={styles.macroLabel}>
            Fats <Text style={styles.subLabel}>left</Text>
          </Text>
          <View style={[styles.ringContainer, { backgroundColor: "#EDF8F5" }]}>
            <View style={[styles.innerRing, { borderColor: "#20B2AA" }]}>
              <Text style={styles.macroEmoji}>🥑</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 140,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  macroValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111111",
    letterSpacing: -0.5,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111111",
    marginTop: 2,
    marginBottom: 12,
  },
  subLabel: {
    fontWeight: "500",
    color: "#8E8E93",
  },
  ringContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  innerRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  macroEmoji: {
    fontSize: 18,
  },
});
