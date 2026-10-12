import React from "react";
import { StyleSheet, Text, View } from "react-native";

type MacroItemProps = {
  name: string;
  consumedGrams: number;
  targetGrams: number;
  color: string;
  emoji: string;
};

function MacroItem({ name, consumedGrams, targetGrams, color, emoji }: MacroItemProps) {
  const percent = targetGrams > 0
    ? Math.min(100, Math.round((consumedGrams / targetGrams) * 100))
    : 0;

  return (
    <View style={styles.macroCard} accessibilityLabel={`${name}: ${consumedGrams} of ${targetGrams} grams`}>
      <View style={styles.topRow}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.name}>{name}</Text>
      </View>

      <View style={styles.valuesRow}>
        <Text style={styles.consumedText}>{consumedGrams}g</Text>
        <Text style={styles.targetText}>/ {targetGrams}g</Text>
      </View>

      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>

      <Text style={styles.percentSub}>{percent}%</Text>
    </View>
  );
}

type MacroCardsProps = {
  consumedProtein: number;
  targetProtein: number;
  consumedCarbs: number;
  targetCarbs: number;
  consumedFat: number;
  targetFat: number;
};

export function MacroCards({
  consumedProtein,
  targetProtein,
  consumedCarbs,
  targetCarbs,
  consumedFat,
  targetFat,
}: MacroCardsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>MACRONUTRIENTS</Text>
      <View style={styles.grid}>
        <MacroItem
          name="Protein"
          consumedGrams={consumedProtein}
          targetGrams={targetProtein}
          color="#D99C79"
          emoji="🍗"
        />
        <MacroItem
          name="Carbs"
          consumedGrams={consumedCarbs}
          targetGrams={targetCarbs}
          color="#739BCB"
          emoji="🌾"
        />
        <MacroItem
          name="Fat"
          consumedGrams={consumedFat}
          targetGrams={targetFat}
          color="#D76891"
          emoji="🥑"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  sectionTitle: {
    color: "#85838A",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    paddingLeft: 2,
  },
  grid: {
    flexDirection: "row",
    gap: 10,
  },
  macroCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EAE9ED",
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emoji: {
    fontSize: 14,
  },
  name: {
    color: "#77747C",
    fontSize: 12,
    fontWeight: "700",
  },
  valuesRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  consumedText: {
    color: "#211F25",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  targetText: {
    color: "#A09DA5",
    fontSize: 11,
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
  percentSub: {
    color: "#85838A",
    fontSize: 10,
    fontWeight: "600",
    alignSelf: "flex-end",
  },
});
