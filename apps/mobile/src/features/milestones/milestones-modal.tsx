import React, { useMemo } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  computeMilestoneBadges,
  type MilestoneBadge,
  type MilestoneStatsInput,
} from "./milestones-domain";

export type MilestonesModalProps = {
  visible: boolean;
  onClose: () => void;
  stats: MilestoneStatsInput;
};

export function MilestonesModal({ visible, onClose, stats }: MilestonesModalProps) {
  const { badges, unlockedCount, totalCount, progressPercent } = useMemo(
    () => computeMilestoneBadges(stats),
    [stats]
  );

  async function handleShare() {
    try {
      await Share.share({
        message: `🔥 I have a ${stats.currentStreak}-day streak and earned ${unlockedCount}/${totalCount} badges on FITAI! Track your nutrition with me.`,
      });
    } catch {
      // User cancelled share
    }
  }

  function handleBadgePress(badge: MilestoneBadge) {
    Alert.alert(
      badge.title,
      `${badge.requirement}\n\nStatus: ${
        badge.isUnlocked
          ? "🎉 Unlocked! Awesome work."
          : `🔒 Locked (Current: ${badge.currentValue} / ${badge.targetValue})`
      }`
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* Top Header Row */}
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onClose}
            style={({ pressed }) => [styles.roundNavButton, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Text style={styles.backArrow}>←</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share milestones"
            onPress={handleShare}
            style={({ pressed }) => [styles.roundNavButton, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Text style={styles.shareIcon}>↗</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text style={styles.title}>Milestones</Text>

          {/* Highlights Row (Flame & Badges Medallions) */}
          <View style={styles.highlightsRow}>
            {/* Left: Day Streak */}
            <View style={styles.highlightItem}>
              <View style={styles.flameContainer}>
                <Text style={styles.largeFlame}>🔥</Text>
                <View style={styles.badgeNumberBubble}>
                  <Text style={styles.bubbleNumber}>{stats.currentStreak}</Text>
                </View>
              </View>
              <Text style={styles.highlightLabel}>Day streak</Text>
            </View>

            {/* Right: Badges Earned */}
            <View style={styles.highlightItem}>
              <View style={styles.shieldContainer}>
                <View style={styles.shieldPolygon}>
                  <Text style={styles.shieldEmoji}>🛡️</Text>
                </View>
                <View style={[styles.badgeNumberBubble, styles.shieldBubble]}>
                  <Text style={styles.bubbleNumber}>{unlockedCount}</Text>
                </View>
              </View>
              <Text style={styles.highlightLabel}>Badges earned</Text>
            </View>
          </View>

          {/* Two Stat Cards */}
          <View style={styles.cardsRow}>
            {/* Card 1: Longest Streak */}
            <View style={styles.statCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardEmoji}>🔥</Text>
                <Text style={styles.cardValue}>{stats.longestStreak} days</Text>
              </View>
              <Text style={styles.cardSubtitle}>longest streak</Text>
            </View>

            {/* Card 2: Badges Count & Progress */}
            <View style={styles.statCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardEmoji}>💎</Text>
                <Text style={styles.cardValue}>
                  {unlockedCount}/{totalCount} Badges
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
            </View>
          </View>

          {/* Badges 3-Column Grid */}
          <View style={styles.badgesGrid}>
            {badges.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => handleBadgePress(b)}
                style={({ pressed }) => [styles.badgeCell, pressed && styles.badgeCellPressed]}
                accessibilityRole="button"
                accessibilityLabel={`${b.title}, ${b.requirement}`}
              >
                {/* Visual Badge Emblem */}
                <View style={[styles.badgeEmblem, b.isUnlocked ? styles.badgeUnlocked : styles.badgeLocked]}>
                  {b.category === "streak" ? (
                    <View style={styles.shieldStreakContent}>
                      <Text style={[styles.streakIconMini, b.isUnlocked && styles.streakIconMiniUnlocked]}>
                        🔥
                      </Text>
                      <Text
                        style={[
                          styles.streakBadgeText,
                          b.isUnlocked ? styles.streakBadgeTextUnlocked : styles.streakBadgeTextLocked,
                        ]}
                      >
                        {b.badgeNumberText}
                      </Text>
                    </View>
                  ) : b.category === "meal" ? (
                    <View style={styles.mealBadgeContent}>
                      <Text style={styles.mealIconMini}>🥣</Text>
                      <Text
                        style={[
                          styles.mealBadgeNumber,
                          b.isUnlocked ? styles.mealBadgeNumberUnlocked : styles.mealBadgeNumberLocked,
                        ]}
                      >
                        {b.badgeNumberText}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.generalBadgeContent}>
                      <Text style={styles.generalBadgeEmoji}>{b.badgeNumberText}</Text>
                    </View>
                  )}
                </View>

                {/* Badge Title & Requirement */}
                <Text style={[styles.badgeTitle, b.isUnlocked && styles.badgeTitleUnlocked]} numberOfLines={1}>
                  {b.title}
                </Text>
                <Text style={styles.badgeRequirement} numberOfLines={1}>
                  {b.requirement}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FDFDFE",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  roundNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  backArrow: {
    fontSize: 22,
    color: "#111111",
    fontWeight: "700",
  },
  shareIcon: {
    fontSize: 20,
    color: "#111111",
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.7,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#111111",
    letterSpacing: -0.8,
    marginBottom: 24,
  },
  highlightsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  highlightItem: {
    alignItems: "center",
    gap: 8,
  },
  flameContainer: {
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  largeFlame: {
    fontSize: 68,
  },
  badgeNumberBubble: {
    position: "absolute",
    bottom: 2,
    minWidth: 32,
    height: 32,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 2.5,
    borderColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  shieldBubble: {
    borderColor: "#111111",
  },
  bubbleNumber: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111111",
  },
  highlightLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111111",
  },
  shieldContainer: {
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  shieldPolygon: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: "#1F1D2B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#D97706",
  },
  shieldEmoji: {
    fontSize: 36,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    justifyContent: "center",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  cardEmoji: {
    fontSize: 16,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111111",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  progressTrack: {
    height: 5,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 3,
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 24,
  },
  badgeCell: {
    width: "31%",
    alignItems: "center",
  },
  badgeCellPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  badgeEmblem: {
    width: 86,
    height: 98,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1.5,
  },
  badgeLocked: {
    backgroundColor: "#F0F1F5",
    borderColor: "#E2E4E9",
  },
  badgeUnlocked: {
    backgroundColor: "#FFFBEB",
    borderColor: "#F59E0B",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  shieldStreakContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  streakIconMini: {
    fontSize: 22,
    opacity: 0.35,
  },
  streakIconMiniUnlocked: {
    opacity: 1,
  },
  streakBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 14,
    letterSpacing: -0.3,
  },
  streakBadgeTextLocked: {
    color: "#9CA3AF",
  },
  streakBadgeTextUnlocked: {
    color: "#D97706",
  },
  mealBadgeContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  mealIconMini: {
    fontSize: 24,
  },
  mealBadgeNumber: {
    fontSize: 13,
    fontWeight: "900",
  },
  mealBadgeNumberLocked: {
    color: "#9CA3AF",
  },
  mealBadgeNumberUnlocked: {
    color: "#D97706",
  },
  generalBadgeContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  generalBadgeEmoji: {
    fontSize: 32,
  },
  badgeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111111",
    textAlign: "center",
    marginBottom: 2,
  },
  badgeTitleUnlocked: {
    color: "#111111",
  },
  badgeRequirement: {
    fontSize: 10,
    color: "#8E8E93",
    fontWeight: "600",
    textAlign: "center",
  },
});
