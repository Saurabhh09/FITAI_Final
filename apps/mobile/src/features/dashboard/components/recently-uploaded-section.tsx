import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LoggedMealBucket, LoggedMealItem } from "../dashboard-domain";
import type { MealTypeDisplay } from "../../food-logging/food-domain";

type RecentlyUploadedSectionProps = {
  mealBuckets: LoggedMealBucket[];
  allMealItems: LoggedMealItem[];
  onAddFood: (mealType: MealTypeDisplay) => void;
  onDeleteItem: (itemId: string) => void;
  isDeletingItemId: string | null;
};

function getItemEmoji(name: string, mealType: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("thali") || lower.includes("curry") || lower.includes("dal") || lower.includes("paneer")) return "🍛";
  if (lower.includes("biryani") || lower.includes("rice") || lower.includes("pulao")) return "🍚";
  if (lower.includes("roti") || lower.includes("chapati") || lower.includes("naan") || lower.includes("bread") || lower.includes("toast")) return "🍞";
  if (lower.includes("apple")) return "🍎";
  if (lower.includes("banana")) return "🍌";
  if (lower.includes("chicken") || lower.includes("breast") || lower.includes("meat")) return "🍗";
  if (lower.includes("egg") || lower.includes("omelet")) return "🍳";
  if (lower.includes("salad")) return "🥗";
  if (lower.includes("milk") || lower.includes("yogurt") || lower.includes("curd")) return "🥛";
  if (lower.includes("coffee") || lower.includes("tea")) return "☕";
  if (lower.includes("pizza")) return "🍕";
  if (lower.includes("burger")) return "🍔";
  if (lower.includes("sandwich")) return "🥪";
  if (mealType === "Breakfast") return "🥣";
  if (mealType === "Lunch") return "🍱";
  if (mealType === "Dinner") return "🍲";
  return "🍽️";
}

export function RecentlyUploadedSection({
  mealBuckets,
  allMealItems,
  onAddFood,
  onDeleteItem,
  isDeletingItemId,
}: RecentlyUploadedSectionProps) {
  const hasItems = allMealItems.length > 0;

  return (
    <View style={styles.container}>
      {/* Section Title */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Recently uploaded</Text>
      </View>

      {/* If meal items logged, show them in sleek cards */}
      {hasItems ? (
        <View style={styles.cardsContainer}>
          {allMealItems.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemEmojiCircle}>
                <Text style={styles.itemEmoji}>{getItemEmoji(item.name, item.mealType)}</Text>
              </View>

              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemSubtext}>
                  {Math.round(item.weightGrams)}g · P {Math.round(item.protein)}g · C {Math.round(item.carbs)}g · F {Math.round(item.fat)}g
                </Text>
              </View>

              <View style={styles.itemRight}>
                <Text style={styles.itemCalories}>{Math.round(item.calories)} kcal</Text>
                <Pressable
                  style={({ pressed }) => [styles.deleteBtn, pressed && styles.btnPressed]}
                  onPress={() => onDeleteItem(item.id)}
                  hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                  accessibilityLabel={`Remove ${item.name}`}
                >
                  <Text style={styles.deleteIcon}>×</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🥗</Text>
          <Text style={styles.emptyTitle}>No meals logged yet today</Text>
          <Text style={styles.emptySubtitle}>Tap the + button to log food or snap a picture of your meal!</Text>
        </View>
      )}

      {/* Meal Categories Quick Buttons */}
      <View style={styles.quickMealRow}>
        {(["Breakfast", "Lunch", "Dinner", "Snacks"] as MealTypeDisplay[]).map((mealType) => (
          <Pressable
            key={mealType}
            style={({ pressed }) => [styles.mealTypeChip, pressed && styles.btnPressed]}
            onPress={() => onAddFood(mealType)}
          >
            <Text style={styles.mealTypeChipText}>+ {mealType}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111111",
    letterSpacing: -0.5,
  },
  cardsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  itemEmojiCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F2F3F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemEmoji: {
    fontSize: 20,
  },
  itemInfo: {
    flex: 1,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 2,
  },
  itemSubtext: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
  },
  itemRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  itemCalories: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111111",
  },
  deleteBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F2F3F7",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIcon: {
    fontSize: 16,
    color: "#8E8E93",
    fontWeight: "700",
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 18,
  },
  quickMealRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mealTypeChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  mealTypeChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111111",
  },
  btnPressed: {
    opacity: 0.7,
  },
});
