import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { formatDisplayDate, todayISO } from "../dashboard-domain";

type DashboardHeaderProps = {
  displayName: string;
  selectedDate: string;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onSignOut: () => void;
};

export function DashboardHeader({
  displayName,
  selectedDate,
  onPreviousDay,
  onNextDay,
  onToday,
  onSignOut,
}: DashboardHeaderProps) {
  const isToday = selectedDate === todayISO();

  return (
    <View style={styles.container}>
      {/* Brand & Account Row */}
      <View style={styles.topRow}>
        <View style={styles.brandRow} accessibilityLabel="FITAI">
          <Image
            source={require("../../../../assets/logo.png")}
            style={styles.brandLogo}
            resizeMode="contain"
            accessible
            accessibilityLabel="FITAI mark"
          />
          <View>
            <Text style={styles.brandName}>FITAI</Text>
            <Text style={styles.greeting} numberOfLines={1}>
              Hello, {displayName}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={onSignOut}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      {/* Date Navigation Bar */}
      <View style={styles.dateBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          onPress={onPreviousDay}
          style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>

        <View style={styles.dateCenter}>
          <Text style={styles.dateTitle}>{formatDisplayDate(selectedDate)}</Text>
          <Text style={styles.dateSubtitle}>{selectedDate}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next day"
          onPress={onNextDay}
          style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.arrowText}>›</Text>
        </Pressable>

        {!isToday && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Jump to today"
            onPress={onToday}
            style={({ pressed }) => [styles.todayButton, pressed && styles.pressed]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandLogo: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#211F25",
    alignItems: "center",
    justifyContent: "center",
  },
  brandLetter: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -1,
  },
  brandName: {
    color: "#211F25",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  greeting: {
    color: "#85838A",
    fontSize: 12,
    fontWeight: "500",
  },
  signOutButton: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EAE9ED",
  },
  signOutText: {
    color: "#77747C",
    fontSize: 12,
    fontWeight: "600",
  },
  dateBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#EAE9ED",
    justifyContent: "space-between",
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F4F3F7",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    color: "#211F25",
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "600",
  },
  dateCenter: {
    alignItems: "center",
  },
  dateTitle: {
    color: "#211F25",
    fontSize: 15,
    fontWeight: "700",
  },
  dateSubtitle: {
    color: "#85838A",
    fontSize: 11,
    fontWeight: "500",
  },
  todayButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#211F25",
    marginLeft: 6,
  },
  todayButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.8,
  },
});
