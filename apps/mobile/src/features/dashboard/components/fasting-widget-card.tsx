import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function FastingWidgetCard() {
  const [isFasting, setIsFasting] = useState(false);

  return (
    <View style={styles.card}>
      {/* Clock Icon Circle */}
      <View style={styles.clockCircle}>
        <Text style={styles.clockIcon}>⏱️</Text>
      </View>

      {/* Timer Text */}
      <View style={styles.textContainer}>
        <Text style={styles.subTitle}>
          {isFasting ? "Fasting active" : "Your next fast in"}
        </Text>
        <Text style={styles.timerText}>
          {isFasting ? "14:32:18" : "23:58:50"}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsRow}>
        <Pressable
          style={({ pressed }) => [
            styles.startBtn,
            isFasting && styles.stopBtn,
            pressed && styles.btnPressed,
          ]}
          onPress={() => setIsFasting((prev) => !prev)}
          hitSlop={6}
        >
          <Text style={[styles.startBtnText, isFasting && styles.stopBtnText]}>
            {isFasting ? "⏹ Stop" : "▶ Start"}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.moreBtn, pressed && styles.btnPressed]}
          hitSlop={6}
        >
          <Text style={styles.moreBtnText}>···</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  clockCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F2F3F7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E5E7ED",
    marginRight: 12,
  },
  clockIcon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  subTitle: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "600",
    marginBottom: 2,
  },
  timerText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.3,
  },
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  startBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtn: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },
  startBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111111",
  },
  stopBtnText: {
    color: "#FFFFFF",
  },
  moreBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
    borderRadius: 999,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  moreBtnText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
    marginTop: -4,
  },
  btnPressed: {
    opacity: 0.7,
  },
});
