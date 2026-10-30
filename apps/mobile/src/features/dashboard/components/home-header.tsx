import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type HomeHeaderProps = {
  streak?: number;
  onPressStreak?: () => void;
};

export function HomeHeader({ streak = 0, onPressStreak }: HomeHeaderProps) {
  return (
    <View style={styles.header}>
      {/* Brand: Icon + Name */}
      <View style={styles.brandRow}>
        <Image
          source={require("../../../../assets/logo.png")}
          style={styles.brandLogo}
          resizeMode="contain"
          accessible
          accessibilityLabel="FITAI logo"
        />
        <Text style={styles.brandTitle}>FITAI</Text>
      </View>

      {/* Streak Badge: 🔥 {streak} */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Day streak: ${streak}. Tap to view milestones.`}
        onPress={onPressStreak}
        style={({ pressed }) => [styles.streakBadge, pressed && styles.streakBadgePressed]}
        hitSlop={6}
      >
        <Text style={styles.streakIcon}>🔥</Text>
        <Text style={styles.streakCount}>{streak}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandLogo: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111111",
    letterSpacing: -0.6,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#EBEBED",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  streakIcon: {
    fontSize: 16,
  },
  streakCount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111111",
  },
  streakBadgePressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
});
