import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  type BackendMealType,
  type CanonicalFoodDetail,
  type FoodServingOption,
  type MealTypeDisplay,
  type QuickFoodItem,
  computeNutrientPreview,
  computePortionGrams,
  formatMealTypeDisplay,
  normalizeMealType,
} from "./food-domain";

type FoodDetailTarget =
  | { type: "usda"; food: CanonicalFoodDetail }
  | { type: "quick"; food: QuickFoodItem };

type FoodDetailViewProps = {
  target: FoodDetailTarget;
  selectedDate: string;
  initialMealType?: MealTypeDisplay;
  isSaving: boolean;
  saveError: string | null;
  onBack: () => void;
  onConfirm: (params: {
    mealType: BackendMealType;
    quantityGrams: number;
    servingDescription: string;
    foodId?: string;
    fdcId?: string;
    quickFoodId?: string;
    nameSnapshot: string;
  }) => void;
};

const MEAL_TYPES: readonly MealTypeDisplay[] = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const MULTIPLIERS = [0.5, 1, 1.5, 2];

export function FoodDetailView({
  target,
  selectedDate,
  initialMealType = "Breakfast",
  isSaving,
  saveError,
  onBack,
  onConfirm,
}: FoodDetailViewProps) {
  const [selectedMealType, setSelectedMealType] = useState<MealTypeDisplay>(initialMealType);

  // Servings and portions
  const isUsda = target.type === "usda";
  const usdaFood = isUsda ? target.food : null;
  const quickFood = !isUsda ? target.food : null;

  const servings: readonly FoodServingOption[] = useMemo(() => {
    if (usdaFood) return usdaFood.servings;
    if (quickFood) {
      return [
        {
          sourcePortionId: "quick-default",
          description: quickFood.serving,
          gramWeight: quickFood.grams,
          isDefault: true,
        },
        {
          sourcePortionId: "100g",
          description: "100 grams",
          gramWeight: 100,
          isDefault: false,
        },
      ];
    }
    return [];
  }, [usdaFood, quickFood]);

  const defaultPortionId = useMemo(() => {
    const def = servings.find((s) => s.isDefault);
    return def ? def.sourcePortionId : servings[0]?.sourcePortionId || "100g";
  }, [servings]);

  const [selectedPortionId, setSelectedPortionId] = useState<string>(defaultPortionId);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [customGrams, setCustomGrams] = useState<string>("100");

  // Compute resolved grams
  const computedGrams = useMemo(() => {
    return computePortionGrams(
      selectedPortionId,
      servings,
      multiplier,
      Number(customGrams) || 100
    );
  }, [selectedPortionId, servings, multiplier, customGrams]);

  // Compute preview macros
  const preview = useMemo(() => {
    if (usdaFood) {
      return computeNutrientPreview(usdaFood.nutrients, computedGrams);
    }
    if (quickFood) {
      const factor = computedGrams / 100;
      const per100Multiplier = 100 / quickFood.grams;
      return {
        calories: Math.round(quickFood.cal * per100Multiplier * factor),
        protein: Math.round(quickFood.p * per100Multiplier * factor * 10) / 10,
        carbs: Math.round(quickFood.c * per100Multiplier * factor * 10) / 10,
        fat: Math.round(quickFood.f * per100Multiplier * factor * 10) / 10,
        fiber: quickFood.fiber ? Math.round(quickFood.fiber * per100Multiplier * factor * 10) / 10 : null,
      };
    }
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }, [usdaFood, quickFood, computedGrams]);

  const displayName = usdaFood ? usdaFood.description : quickFood?.name || "";
  const brandOrCategory = usdaFood
    ? usdaFood.brandOwner || usdaFood.foodCategory || "Standard Reference"
    : "Verified Quick Food";

  function handleLog() {
    let servingDesc = `${Math.round(computedGrams)}g`;
    if (selectedPortionId !== "custom_grams") {
      const found = servings.find((s) => s.sourcePortionId === selectedPortionId);
      if (found) {
        servingDesc = multiplier === 1 ? found.description : `${multiplier}x ${found.description}`;
      }
    }

    onConfirm({
      mealType: normalizeMealType(selectedMealType),
      quantityGrams: computedGrams,
      servingDescription: servingDesc,
      foodId: usdaFood?.id,
      fdcId: usdaFood?.sourceFoodId,
      quickFoodId: quickFood?.id,
      nameSnapshot: displayName,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Bar */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to food search"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.topBarDate}>{selectedDate}</Text>
      </View>

      {/* Food Title & Metadata */}
      <View style={styles.card}>
        <Text style={styles.foodTitle}>{displayName}</Text>
        <Text style={styles.foodMeta}>{brandOrCategory}</Text>
      </View>

      {/* Live Nutrition Fact Badges */}
      <View style={styles.nutritionRow}>
        <View style={[styles.nutrientBadge, styles.calBadge]}>
          <Text style={styles.nutrientVal}>{preview.calories ?? "—"}</Text>
          <Text style={styles.nutrientLabel}>Calories</Text>
        </View>
        <View style={styles.nutrientBadge}>
          <Text style={styles.nutrientVal}>{preview.protein !== null ? `${preview.protein}g` : "—"}</Text>
          <Text style={styles.nutrientLabel}>Protein</Text>
        </View>
        <View style={styles.nutrientBadge}>
          <Text style={styles.nutrientVal}>{preview.carbs !== null ? `${preview.carbs}g` : "—"}</Text>
          <Text style={styles.nutrientLabel}>Carbs</Text>
        </View>
        <View style={styles.nutrientBadge}>
          <Text style={styles.nutrientVal}>{preview.fat !== null ? `${preview.fat}g` : "—"}</Text>
          <Text style={styles.nutrientLabel}>Fat</Text>
        </View>
        <View style={styles.nutrientBadge}>
          <Text style={styles.nutrientVal}>{preview.fiber !== null ? `${preview.fiber}g` : "—"}</Text>
          <Text style={styles.nutrientLabel}>Fiber</Text>
        </View>
      </View>

      {/* Serving Portion Selector */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>SERVING PORTION</Text>
        <View style={styles.pillGroup}>
          {servings.map((s) => {
            const isSelected = selectedPortionId === s.sourcePortionId;
            return (
              <Pressable
                key={s.sourcePortionId}
                accessibilityRole="button"
                accessibilityLabel={`Serving portion ${s.description}`}
                onPress={() => setSelectedPortionId(s.sourcePortionId)}
                style={[styles.pill, isSelected && styles.pillActive]}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                  {s.description}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Custom grams portion"
            onPress={() => setSelectedPortionId("custom_grams")}
            style={[styles.pill, selectedPortionId === "custom_grams" && styles.pillActive]}
          >
            <Text
              style={[
                styles.pillText,
                selectedPortionId === "custom_grams" && styles.pillTextActive,
              ]}
            >
              Custom Grams
            </Text>
          </Pressable>
        </View>

        {/* Multiplier / Custom Input */}
        {selectedPortionId === "custom_grams" ? (
          <View style={styles.customGramBox}>
            <Text style={styles.inputLabel}>Enter weight in grams (1–5000g):</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={customGrams}
              onChangeText={setCustomGrams}
              maxLength={5}
              placeholder="100"
              placeholderTextColor="#A09DA5"
            />
          </View>
        ) : (
          <View style={styles.multiplierBox}>
            <Text style={styles.inputLabel}>Serving quantity:</Text>
            <View style={styles.multiplierRow}>
              {MULTIPLIERS.map((m) => {
                const isSelected = multiplier === m;
                return (
                  <Pressable
                    key={m}
                    accessibilityRole="button"
                    accessibilityLabel={`${m} times serving`}
                    onPress={() => setMultiplier(m)}
                    style={[styles.multiplierButton, isSelected && styles.multiplierButtonActive]}
                  >
                    <Text
                      style={[
                        styles.multiplierText,
                        isSelected && styles.multiplierTextActive,
                      ]}
                    >
                      {m}x
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.totalWeightBar}>
          <Text style={styles.totalWeightLabel}>Total Portion Weight:</Text>
          <Text style={styles.totalWeightValue}>{Math.round(computedGrams)}g</Text>
        </View>
      </View>

      {/* Meal Type Selection */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>LOG TO MEAL</Text>
        <View style={styles.mealTypeRow}>
          {MEAL_TYPES.map((type) => {
            const isSelected = selectedMealType === type;
            return (
              <Pressable
                key={type}
                accessibilityRole="button"
                accessibilityLabel={`Meal type ${type}`}
                onPress={() => setSelectedMealType(type)}
                style={[styles.mealTypePill, isSelected && styles.mealTypePillActive]}
              >
                <Text
                  style={[styles.mealTypeText, isSelected && styles.mealTypeTextActive]}
                >
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Error Message if Save Failed */}
      {saveError ? (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <Text style={styles.errorText}>⚠️ {saveError}</Text>
        </View>
      ) : null}

      {/* Confirm Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Confirm add meal"
        disabled={isSaving}
        onPress={handleLog}
        style={({ pressed }) => [
          styles.submitButton,
          isSaving && styles.submitButtonDisabled,
          pressed && styles.pressed,
        ]}
      >
        {isSaving ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.submitButtonText}>
            Add to {selectedMealType} ({preview.calories ?? 0} kcal)
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#EAE9ED",
  },
  backButtonText: {
    color: "#211F25",
    fontSize: 14,
    fontWeight: "700",
  },
  topBarDate: {
    color: "#85838A",
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAE9ED",
    gap: 12,
  },
  foodTitle: {
    color: "#211F25",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  foodMeta: {
    color: "#85838A",
    fontSize: 13,
  },
  nutritionRow: {
    flexDirection: "row",
    gap: 8,
  },
  nutrientBadge: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#EAE9ED",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  calBadge: {
    backgroundColor: "#211F25",
    borderColor: "#211F25",
  },
  nutrientVal: {
    color: "#211F25",
    fontSize: 14,
    fontWeight: "800",
  },
  nutrientLabel: {
    color: "#85838A",
    fontSize: 10,
    fontWeight: "600",
  },
  sectionHeader: {
    color: "#85838A",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  pillGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F4F3F7",
    borderWidth: 1,
    borderColor: "#EAE9ED",
  },
  pillActive: {
    backgroundColor: "#211F25",
    borderColor: "#211F25",
  },
  pillText: {
    color: "#211F25",
    fontSize: 13,
    fontWeight: "600",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  multiplierBox: {
    gap: 8,
    paddingTop: 4,
  },
  customGramBox: {
    gap: 8,
    paddingTop: 4,
  },
  inputLabel: {
    color: "#77747C",
    fontSize: 12,
    fontWeight: "600",
  },
  multiplierRow: {
    flexDirection: "row",
    gap: 8,
  },
  multiplierButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F4F3F7",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAE9ED",
  },
  multiplierButtonActive: {
    backgroundColor: "#211F25",
    borderColor: "#211F25",
  },
  multiplierText: {
    color: "#211F25",
    fontSize: 13,
    fontWeight: "700",
  },
  multiplierTextActive: {
    color: "#FFFFFF",
  },
  textInput: {
    backgroundColor: "#F8F7FB",
    borderWidth: 1,
    borderColor: "#D5D4D8",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: "#211F25",
    fontSize: 15,
    fontWeight: "700",
  },
  totalWeightBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F4F3F7",
    paddingTop: 10,
  },
  totalWeightLabel: {
    color: "#85838A",
    fontSize: 13,
    fontWeight: "600",
  },
  totalWeightValue: {
    color: "#211F25",
    fontSize: 14,
    fontWeight: "800",
  },
  mealTypeRow: {
    flexDirection: "row",
    gap: 6,
  },
  mealTypePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F4F3F7",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAE9ED",
  },
  mealTypePillActive: {
    backgroundColor: "#211F25",
    borderColor: "#211F25",
  },
  mealTypeText: {
    color: "#211F25",
    fontSize: 12,
    fontWeight: "700",
  },
  mealTypeTextActive: {
    color: "#FFFFFF",
  },
  errorBanner: {
    backgroundColor: "#FDE8E8",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FBD5D5",
  },
  errorText: {
    color: "#9B1C1C",
    fontSize: 13,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#211F25",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.85,
  },
});
