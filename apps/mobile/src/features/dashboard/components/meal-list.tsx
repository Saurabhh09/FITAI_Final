import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { LoggedMealBucket } from "../dashboard-domain";
import type { MealTypeDisplay } from "../../food-logging/food-domain";

type MealListProps = {
  mealBuckets: LoggedMealBucket[];
  totalMealsCount: number;
  onAddFood?: (mealType: MealTypeDisplay) => void;
  onDeleteFood?: (itemId: string, name: string) => void;
  isDeletingId?: string | null;
};

const MEAL_ICONS: Record<string, string> = {
  Breakfast: "🌅",
  Lunch: "☀️",
  Dinner: "🌙",
  Snacks: "🍎",
};

export function MealList({
  mealBuckets,
  totalMealsCount,
  onAddFood,
  onDeleteFood,
  isDeletingId,
}: MealListProps) {
  if (totalMealsCount === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>MEALS LOGGED</Text>
          {onAddFood ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add Food"
              onPress={() => onAddFood("Breakfast")}
              style={({ pressed }) => [styles.headerAddButton, pressed && styles.pressed]}
            >
              <Text style={styles.headerAddButtonText}>+ Add Food</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.emptyCard} accessibilityRole="summary" accessibilityLabel="No meals logged">
          <Text style={styles.emptyIcon}>🍽️</Text>
          <Text style={styles.emptyTitle}>No meals logged for this date</Text>
          <Text style={styles.emptySubtitle}>
            When you log food, your consumed calories, macros, and meal items will appear here.
          </Text>
          {onAddFood ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add your first meal"
              onPress={() => onAddFood("Breakfast")}
              style={({ pressed }) => [styles.emptyAddButton, pressed && styles.pressed]}
            >
              <Text style={styles.emptyAddButtonText}>+ Add Food</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>MEALS LOGGED</Text>
        {onAddFood ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add Food"
            onPress={() => onAddFood("Breakfast")}
            style={({ pressed }) => [styles.headerAddButton, pressed && styles.pressed]}
          >
            <Text style={styles.headerAddButtonText}>+ Add Food</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.bucketList}>
        {mealBuckets.map((bucket) => {
          const hasItems = bucket.items.length > 0;

          return (
            <View key={bucket.mealType} style={styles.bucketCard}>
              {/* Bucket Header */}
              <View style={styles.bucketHeader}>
                <View style={styles.bucketHeaderLeft}>
                  <Text style={styles.bucketEmoji}>{MEAL_ICONS[bucket.mealType] || "🍴"}</Text>
                  <Text style={styles.bucketTitle}>{bucket.mealType}</Text>
                </View>
                <View style={styles.bucketHeaderRight}>
                  <Text style={styles.bucketCalories}>
                    {bucket.totals.calories} kcal
                  </Text>
                  {onAddFood ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add food to ${bucket.mealType}`}
                      onPress={() => onAddFood(bucket.mealType)}
                      style={({ pressed }) => [styles.bucketAddButton, pressed && styles.pressed]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.bucketAddButtonText}>+ Add</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {/* Bucket Items or Empty Text */}
              {hasItems ? (
                <View style={styles.itemsList}>
                  {bucket.items.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.itemMeta}>
                          {item.serving} · P {item.protein}g · C {item.carbs}g · F {item.fat}g
                        </Text>
                      </View>
                      <View style={styles.itemRightSide}>
                        <Text style={styles.itemCalories}>{item.calories} kcal</Text>
                        {onDeleteFood ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Delete ${item.name}`}
                            disabled={isDeletingId === item.id}
                            onPress={() => onDeleteFood(item.id, item.name)}
                            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            {isDeletingId === item.id ? (
                              <ActivityIndicator size="small" color="#9B1C1C" />
                            ) : (
                              <Text style={styles.deleteButtonText}>✕</Text>
                            )}
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.bucketEmptyText}>No items logged</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  sectionTitle: {
    color: "#85838A",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    paddingLeft: 2,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#EAE9ED",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  emptyTitle: {
    color: "#211F25",
    fontSize: 16,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: "#85838A",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
  bucketList: {
    gap: 12,
  },
  bucketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAE9ED",
    gap: 12,
  },
  bucketHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bucketHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bucketEmoji: {
    fontSize: 16,
  },
  bucketTitle: {
    color: "#211F25",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  bucketCalories: {
    color: "#211F25",
    fontSize: 14,
    fontWeight: "700",
  },
  bucketEmptyText: {
    color: "#A09DA5",
    fontSize: 13,
    fontStyle: "italic",
    paddingTop: 4,
  },
  itemsList: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#F4F3F7",
    paddingTop: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    color: "#211F25",
    fontSize: 14,
    fontWeight: "600",
  },
  itemMeta: {
    color: "#85838A",
    fontSize: 12,
  },
  itemCalories: {
    color: "#211F25",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerAddButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "#211F25",
    borderRadius: 8,
  },
  headerAddButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyAddButton: {
    marginTop: 8,
    backgroundColor: "#211F25",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  emptyAddButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  bucketHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bucketAddButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#F4F3F7",
    borderWidth: 1,
    borderColor: "#EAE9ED",
  },
  bucketAddButtonText: {
    color: "#211F25",
    fontSize: 11,
    fontWeight: "700",
  },
  itemRightSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteButton: {
    padding: 4,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#FDE8E8",
  },
  deleteButtonText: {
    color: "#9B1C1C",
    fontSize: 11,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.7,
  },
});
