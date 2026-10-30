import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ExpenditureRow } from "../progress-domain";

type ProgressExpenditureCardProps = {
  expenditureChanges: ExpenditureRow[];
};

export function ProgressExpenditureCard({ expenditureChanges }: ProgressExpenditureCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Expenditure Changes</Text>

      <View style={styles.rowsContainer}>
        {expenditureChanges.map((row, index) => {
          const isUp = row.trendType === "up";
          const isDown = row.trendType === "down";

          return (
            <View key={row.label || index} style={styles.row}>
              {/* Window Label */}
              <View style={styles.labelCol}>
                <Text style={styles.labelText}>{row.label}</Text>
              </View>

              {/* Tan accent line */}
              <View style={styles.dashLine} />

              {/* Stats & Trend */}
              <View style={styles.valueCol}>
                <Text style={styles.kcalValue}>
                  {row.avgKcal > 0 ? `${row.avgKcal.toFixed(1)} Kcal` : "0.0 Kcal"}
                </Text>
                <Text style={styles.arrowIcon}>→</Text>
                <Text
                  style={[
                    styles.trendText,
                    isUp && styles.trendUp,
                    isDown && styles.trendDown,
                  ]}
                >
                  {row.trend}
                </Text>
              </View>
            </View>
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
    marginBottom: 16,
  },
  rowsContainer: {
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelCol: {
    width: 65,
  },
  labelText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
  },
  dashLine: {
    width: 32,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#CBB69D", // Warm tan accent dash matching reference
    marginHorizontal: 10,
  },
  valueCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  kcalValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  arrowIcon: {
    fontSize: 13,
    color: "#CBB69D",
    fontWeight: "600",
  },
  trendText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
  },
  trendUp: {
    color: "#D97706",
    fontWeight: "600",
  },
  trendDown: {
    color: "#0284C7",
    fontWeight: "600",
  },
});
