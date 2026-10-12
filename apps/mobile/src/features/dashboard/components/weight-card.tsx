import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatWeightDisplay } from "../../tracking/tracking-domain";

type WeightCardProps = {
  latestWeightKg: number | null;
  latestWeightDate: string | null;
  baselineWeightKg: number;
  targetWeightKg: number | null;
  onLogWeight: () => void;
};

export function WeightCard({
  latestWeightKg,
  latestWeightDate,
  baselineWeightKg,
  targetWeightKg,
  onLogWeight,
}: WeightCardProps) {
  // Format recorded date if present
  let dateText = "No recorded weigh-ins";
  if (latestWeightDate) {
    try {
      const d = new Date(latestWeightDate);
      dateText = `Recorded ${d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;
    } catch {
      dateText = "Recorded recently";
    }
  }

  return (
    <View style={styles.card} accessibilityLabel="Body weight tracking card">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>⚖️</Text>
          <Text style={styles.title}>BODY WEIGHT</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log current body weight"
          onPress={onLogWeight}
          style={({ pressed }) => [styles.logBtn, pressed && styles.pressed]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.logBtnText}>+ Log Weight</Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.contentRow}>
        <View style={styles.weightCol}>
          <View style={styles.valueRow}>
            <Text style={styles.weightValue}>
              {latestWeightKg !== null ? formatWeightDisplay(latestWeightKg, "kg") : "--"}
            </Text>
          </View>
          <Text style={styles.dateSubtitle}>{dateText}</Text>
        </View>

        <View style={styles.metaCol}>
          <View style={styles.metaBadge}>
            <Text style={styles.metaLabel}>BASELINE</Text>
            <Text style={styles.metaValue}>{formatWeightDisplay(baselineWeightKg, "kg")}</Text>
          </View>
          {targetWeightKg !== null ? (
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>TARGET</Text>
              <Text style={styles.metaValue}>{formatWeightDisplay(targetWeightKg, "kg")}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAE9ED",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleRow: {
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
  logBtn: {
    backgroundColor: "#F4F3F7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EAE9ED",
  },
  logBtnText: {
    color: "#211F25",
    fontSize: 12,
    fontWeight: "700",
  },
  contentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weightCol: {
    gap: 4,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  weightValue: {
    color: "#211F25",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  dateSubtitle: {
    color: "#85838A",
    fontSize: 11,
    fontWeight: "500",
  },
  metaCol: {
    alignItems: "flex-end",
    gap: 6,
  },
  metaBadge: {
    alignItems: "flex-end",
    backgroundColor: "#FAF9FB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ECEAF2",
  },
  metaLabel: {
    color: "#85838A",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  metaValue: {
    color: "#211F25",
    fontSize: 12,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.7,
  },
});
