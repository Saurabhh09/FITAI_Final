import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getCalendarWeekDays } from "../progress-domain";

type ProgressStreakBadgesCardProps = {
  currentStreak: number;
  unlockedBadgesCount: number;
  currentWeekLoggedDays: Record<string, boolean>;
  onPressStreak?: () => void;
  onPressBadges?: () => void;
};

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export function ProgressStreakBadgesCard({
  currentStreak,
  unlockedBadgesCount,
  currentWeekLoggedDays,
  onPressStreak,
  onPressBadges,
}: ProgressStreakBadgesCardProps) {
  const currentWeekDays = getCalendarWeekDays(0);

  return (
    <View style={styles.row}>
      {/* 1. Day Streak Card */}
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={onPressStreak}
        accessibilityRole="button"
        accessibilityLabel={`Day streak: ${currentStreak}. Tap to view milestones.`}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.flameIcon}>🔥</Text>
          <View style={styles.streakNumberPill}>
            <Text style={styles.streakNumberText}>{currentStreak}</Text>
          </View>
        </View>

        <Text style={styles.cardTitle}>Day streak</Text>

        {/* Mini S M T W T F S dots row */}
        <View style={styles.miniWeekRow}>
          {currentWeekDays.map((dateISO, idx) => {
            const hasLogged = !!currentWeekLoggedDays[dateISO];
            return (
              <View key={dateISO} style={styles.miniDayCol}>
                <Text style={styles.miniDayLetter}>{DAY_LETTERS[idx]}</Text>
                <View
                  style={[
                    styles.miniDot,
                    hasLogged ? styles.miniDotLogged : styles.miniDotEmpty,
                  ]}
                />
              </View>
            );
          })}
        </View>
      </Pressable>

      {/* 2. Badges Earned Card */}
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={onPressBadges || onPressStreak}
        accessibilityRole="button"
        accessibilityLabel={`Badges earned: ${unlockedBadgesCount}. Tap to view badges.`}
      >
        <View style={styles.iconContainer}>
          <View style={styles.shieldMedallion}>
            <Text style={styles.shieldIcon}>🛡️</Text>
            <View style={styles.badgeNumberCircle}>
              <Text style={styles.badgeNumberText}>{unlockedBadgesCount}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.cardTitle}>Badges earned</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F0F0F2",
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginTop: 4,
    minHeight: 64,
  },
  flameIcon: {
    fontSize: 42,
  },
  streakNumberPill: {
    position: "absolute",
    bottom: -2,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#FB923C",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  streakNumberText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#EA580C",
  },
  shieldMedallion: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1F2937",
    borderWidth: 2,
    borderColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  shieldIcon: {
    fontSize: 22,
  },
  badgeNumberCircle: {
    position: "absolute",
    bottom: -6,
    backgroundColor: "#111827",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 12,
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeNumberText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginTop: 10,
    marginBottom: 8,
    textAlign: "center",
  },
  miniWeekRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  miniDayCol: {
    alignItems: "center",
    gap: 4,
  },
  miniDayLetter: {
    fontSize: 9,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  miniDotLogged: {
    backgroundColor: "#EA580C",
  },
  miniDotEmpty: {
    backgroundColor: "#E5E7EB",
  },
});
