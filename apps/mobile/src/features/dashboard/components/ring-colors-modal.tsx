import React from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type RingColorsModalProps = {
  visible: boolean;
  onClose: () => void;
  streak?: number;
};

export function RingColorsModal({ visible, onClose, streak = 2 }: RingColorsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onClose}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Ring Colors Explained</Text>
          <View style={styles.placeholderButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Sample Preview Card matching Image 2 */}
          <View style={styles.previewCard}>
            {/* Brand Header inside preview */}
            <View style={styles.previewBrandRow}>
              <View style={styles.brandGroup}>
                <Image
                  source={require("../../../../assets/logo.png")}
                  style={styles.previewLogo}
                  resizeMode="contain"
                />
                <Text style={styles.previewBrandTitle}>FITAI</Text>
              </View>

              <View style={styles.previewStreakBadge}>
                <Text style={styles.previewStreakIcon}>🔥</Text>
                <Text style={styles.previewStreakText}>{streak > 0 ? streak : 15}</Text>
              </View>
            </View>

            {/* Sample Week Strip inside preview */}
            <View style={styles.sampleWeekRow}>
              {/* Sun 10: Green */}
              <View style={styles.sampleDayCol}>
                <Text style={styles.sampleDayLabel}>Sun</Text>
                <View style={[styles.sampleCircle, styles.circleGreen]}>
                  <Text style={styles.sampleDayNumber}>10</Text>
                </View>
              </View>

              {/* Mon 11: Red */}
              <View style={styles.sampleDayCol}>
                <Text style={styles.sampleDayLabel}>Mon</Text>
                <View style={[styles.sampleCircle, styles.circleRed]}>
                  <Text style={styles.sampleDayNumber}>11</Text>
                </View>
              </View>

              {/* Tue 12: Dotted */}
              <View style={styles.sampleDayCol}>
                <Text style={styles.sampleDayLabel}>Tue</Text>
                <View style={[styles.sampleCircle, styles.circleDotted]}>
                  <Text style={styles.sampleDayNumber}>12</Text>
                </View>
              </View>

              {/* Wed 13: Green */}
              <View style={styles.sampleDayCol}>
                <Text style={styles.sampleDayLabel}>Wed</Text>
                <View style={[styles.sampleCircle, styles.circleGreen]}>
                  <Text style={styles.sampleDayNumber}>13</Text>
                </View>
              </View>

              {/* Thu 14: Yellow */}
              <View style={styles.sampleDayCol}>
                <Text style={styles.sampleDayLabel}>Thu</Text>
                <View style={[styles.sampleCircle, styles.circleYellow]}>
                  <Text style={styles.sampleDayNumber}>14</Text>
                </View>
              </View>

              {/* Fri 15: Gray */}
              <View style={styles.sampleDayCol}>
                <Text style={styles.sampleDayLabel}>Fri</Text>
                <View style={[styles.sampleCircle, styles.circleGray]}>
                  <Text style={styles.sampleDayNumber}>15</Text>
                </View>
              </View>

              {/* Sat 16: Gray */}
              <View style={styles.sampleDayCol}>
                <Text style={styles.sampleDayLabel}>Sat</Text>
                <View style={[styles.sampleCircle, styles.circleGray]}>
                  <Text style={styles.sampleDayNumber}>16</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Explanation Text */}
          <Text style={styles.explanationParagraph}>
            On the homepage calendar, the colored rings around each date show how close you were to your daily calorie goal:
          </Text>

          {/* Ring Rules List */}
          <View style={styles.rulesList}>
            {/* 1. Green */}
            <View style={styles.ruleItem}>
              <View style={[styles.ruleIconCircle, styles.circleGreen]} />
              <View style={styles.ruleTextGroup}>
                <Text style={styles.ruleTitle}>Green</Text>
                <Text style={styles.ruleDescription}>All calories taken, or less than 100 calories left</Text>
              </View>
            </View>

            {/* 2. Orange */}
            <View style={styles.ruleItem}>
              <View style={[styles.ruleIconCircle, styles.circleYellow]} />
              <View style={styles.ruleTextGroup}>
                <Text style={styles.ruleTitle}>Orange</Text>
                <Text style={styles.ruleDescription}>100–200 calories left to reach your goal</Text>
              </View>
            </View>

            {/* 3. Red */}
            <View style={styles.ruleItem}>
              <View style={[styles.ruleIconCircle, styles.circleRed]} />
              <View style={styles.ruleTextGroup}>
                <Text style={styles.ruleTitle}>Red</Text>
                <Text style={styles.ruleDescription}>200+ calories left to reach your goal</Text>
              </View>
            </View>

            {/* 4. Dotted */}
            <View style={styles.ruleItem}>
              <View style={[styles.ruleIconCircle, styles.circleDotted]} />
              <View style={styles.ruleTextGroup}>
                <Text style={styles.ruleTitle}>Dotted</Text>
                <Text style={styles.ruleDescription}>No meals logged that day</Text>
              </View>
            </View>

            {/* 5. Grey */}
            <View style={styles.ruleItem}>
              <View style={[styles.ruleIconCircle, styles.circleGray]} />
              <View style={styles.ruleTextGroup}>
                <Text style={styles.ruleTitle}>Grey</Text>
                <Text style={styles.ruleDescription}>Upcoming days</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F4F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 22,
    color: "#111111",
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
  },
  placeholderButton: {
    width: 44,
  },
  pressed: {
    opacity: 0.7,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  previewCard: {
    backgroundColor: "#F9F9FB",
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#EFEFF2",
  },
  previewBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  brandGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  previewBrandTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111111",
    letterSpacing: -0.5,
  },
  previewStreakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#EBEBED",
  },
  previewStreakIcon: {
    fontSize: 14,
  },
  previewStreakText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111111",
  },
  sampleWeekRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sampleDayCol: {
    alignItems: "center",
    gap: 6,
  },
  sampleDayLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8E8E93",
  },
  sampleCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  sampleDayNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111111",
  },
  circleGreen: {
    borderWidth: 2.5,
    borderColor: "#4ADE80",
    borderStyle: "solid",
  },
  circleYellow: {
    borderWidth: 2.5,
    borderColor: "#FB923C",
    borderStyle: "solid",
  },
  circleRed: {
    borderWidth: 2.5,
    borderColor: "#F87171",
    borderStyle: "solid",
  },
  circleDotted: {
    borderWidth: 2,
    borderColor: "#9CA3AF",
    borderStyle: "dashed",
    backgroundColor: "transparent",
  },
  circleGray: {
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "solid",
  },
  explanationParagraph: {
    fontSize: 16,
    lineHeight: 24,
    color: "#6B7280",
    marginBottom: 28,
  },
  rulesList: {
    gap: 24,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  ruleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  ruleTextGroup: {
    flex: 1,
    gap: 2,
  },
  ruleTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111111",
  },
  ruleDescription: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
});
