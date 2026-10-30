import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { BMIData } from "../progress-domain";

type ProgressBMICardProps = {
  bmiData: BMIData;
};

export function ProgressBMICard({ bmiData }: ProgressBMICardProps) {
  // Needle position between 2% and 98% to stay nicely within bounds
  const needleLeft = Math.max(2, Math.min(98, bmiData.percentPosition));

  return (
    <View style={styles.card}>
      {/* 1. Card Title */}
      <Text style={styles.cardTitle}>Your BMI</Text>

      {/* 2. Value and Category Tag */}
      <View style={styles.valueRow}>
        <Text style={styles.bmiNumber}>{bmiData.bmi.toFixed(2)}</Text>
        <Text style={styles.weightStatusPrefix}>Your weight is</Text>
        <View style={[styles.categoryBadge, { backgroundColor: bmiData.categoryColor }]}>
          <Text style={styles.categoryBadgeText}>{bmiData.categoryLabel}</Text>
        </View>
        <View style={styles.infoCircle}>
          <Text style={styles.infoIcon}>ⓘ</Text>
        </View>
      </View>

      {/* 3. Spectrum Bar with Needle */}
      <View style={styles.spectrumWrapper}>
        {/* Multi-segment continuous color spectrum bar */}
        <View style={styles.spectrumBar}>
          <View style={[styles.spectrumSegment, { backgroundColor: "#0284C7" }]} />
          <View style={[styles.spectrumSegment, { backgroundColor: "#22C55E" }]} />
          <View style={[styles.spectrumSegment, { backgroundColor: "#F59E0B" }]} />
          <View style={[styles.spectrumSegment, { backgroundColor: "#EF4444" }]} />
        </View>

        {/* Dynamic Needle indicator */}
        <View
          style={[
            styles.needleContainer,
            {
              left: `${needleLeft}%`,
            },
          ]}
        >
          <View style={styles.needleLine} />
        </View>
      </View>

      {/* 4. Category Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#0284C7" }]} />
          <Text style={styles.legendText}>Underweight</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#22C55E" }]} />
          <Text style={styles.legendText}>Healthy</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
          <Text style={styles.legendText}>Overweight</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
          <Text style={styles.legendText}>Obese</Text>
        </View>
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
    marginBottom: 40,
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
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 8,
  },
  bmiNumber: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
    marginRight: 4,
  },
  weightStatusPrefix: {
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  infoCircle: {
    marginLeft: 2,
  },
  infoIcon: {
    fontSize: 16,
    color: "#94A3B8",
  },
  spectrumWrapper: {
    position: "relative",
    height: 24,
    justifyContent: "center",
    marginVertical: 10,
  },
  spectrumBar: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    width: "100%",
  },
  spectrumSegment: {
    flex: 1,
    height: "100%",
  },
  needleContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    alignItems: "center",
    justifyContent: "center",
  },
  needleLine: {
    width: 2.5,
    height: 20,
    borderRadius: 1,
    backgroundColor: "#0F172A",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 2,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
  },
});
