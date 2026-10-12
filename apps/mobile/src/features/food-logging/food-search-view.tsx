import React, { useState } from "react";
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
  type FoodSearchResult,
  type QuickFoodItem,
  VERIFIED_QUICK_FOODS,
} from "./food-domain";

type FoodSearchViewProps = {
  isSearching: boolean;
  searchError: string | null;
  searchResults: FoodSearchResult[];
  hasSearched: boolean;
  onSearch: (query: string) => void;
  onSelectUsdaFood: (fdcId: string) => void;
  onSelectQuickFood: (food: QuickFoodItem) => void;
  onClose: () => void;
};

export function FoodSearchView({
  isSearching,
  searchError,
  searchResults,
  hasSearched,
  onSearch,
  onSelectUsdaFood,
  onSelectQuickFood,
  onClose,
}: FoodSearchViewProps) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"quick" | "usda">("quick");

  function handleSubmitSearch() {
    if (query.trim().length >= 2) {
      setActiveTab("usda");
      onSearch(query.trim());
    }
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Add Food</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close food search"
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search USDA foods (e.g. apple, chicken)..."
          placeholderTextColor="#A09DA5"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSubmitSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search"
          disabled={isSearching || query.trim().length < 2}
          onPress={handleSubmitSearch}
          style={({ pressed }) => [
            styles.searchButton,
            (isSearching || query.trim().length < 2) && styles.searchButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quick foods tab"
          onPress={() => setActiveTab("quick")}
          style={[styles.tab, activeTab === "quick" && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === "quick" && styles.tabTextActive]}>
            Quick Foods
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="USDA search tab"
          onPress={() => setActiveTab("usda")}
          style={[styles.tab, activeTab === "usda" && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === "usda" && styles.tabTextActive]}>
            USDA Search {searchResults.length > 0 ? `(${searchResults.length})` : ""}
          </Text>
        </Pressable>
      </View>

      {/* Content Area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "quick" ? (
          <View style={styles.quickSection}>
            <Text style={styles.sectionSubtitle}>Verified standard foods</Text>
            <View style={styles.quickGrid}>
              {VERIFIED_QUICK_FOODS.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${item.name}`}
                  onPress={() => onSelectQuickFood(item)}
                  style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
                >
                  <Text style={styles.quickEmoji}>{item.emoji}</Text>
                  <View style={styles.quickInfo}>
                    <Text style={styles.quickName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.quickServing} numberOfLines={1}>
                      {item.serving}
                    </Text>
                  </View>
                  <View style={styles.quickNutrients}>
                    <Text style={styles.quickCal}>{item.cal} kcal</Text>
                    <Text style={styles.quickMacro}>P {item.p}g · C {item.c}g</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.usdaSection}>
            {/* Search Loading */}
            {isSearching ? (
              <View style={styles.statusBox}>
                <ActivityIndicator size="large" color="#211F25" />
                <Text style={styles.statusText}>Searching USDA FoodData Central...</Text>
              </View>
            ) : searchError ? (
              /* Search Error */
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>Search unavailable</Text>
                <Text style={styles.errorSubtitle}>{searchError}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry search"
                  onPress={handleSubmitSearch}
                  style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
              </View>
            ) : hasSearched && searchResults.length === 0 ? (
              /* Empty Search Results */
              <View style={styles.statusBox} accessibilityRole="summary" accessibilityLabel="No foods found">
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.statusTitle}>No foods found</Text>
                <Text style={styles.statusSubtitle}>
                  Try searching for general food terms like "egg", "rice", or "apple".
                </Text>
              </View>
            ) : !hasSearched ? (
              /* Search Prompt */
              <View style={styles.statusBox}>
                <Text style={styles.promptIcon}>🥗</Text>
                <Text style={styles.statusTitle}>Search USDA Database</Text>
                <Text style={styles.statusSubtitle}>
                  Type a food name above to find verified nutrient data from USDA FoodData Central.
                </Text>
              </View>
            ) : (
              /* Search Results List */
              <View style={styles.resultsList}>
                {searchResults.map((food) => (
                  <Pressable
                    key={food.sourceId}
                    accessibilityRole="button"
                    accessibilityLabel={`Select food ${food.description}`}
                    onPress={() => onSelectUsdaFood(food.sourceId)}
                    style={({ pressed }) => [styles.resultCard, pressed && styles.pressed]}
                  >
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle} numberOfLines={2}>
                        {food.description}
                      </Text>
                      <Text style={styles.resultMeta}>
                        {food.brandOwner ? `${food.brandOwner} · ` : ""}
                        {food.foodCategory || food.dataType}
                      </Text>
                    </View>
                    <View style={styles.selectBadge}>
                      <Text style={styles.selectBadgeText}>Select →</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7FB",
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#211F25",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#EAE9ED",
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: "#211F25",
    fontSize: 14,
    fontWeight: "700",
  },
  searchBar: {
    flexDirection: "row",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D5D4D8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#211F25",
    fontSize: 14,
  },
  searchButton: {
    backgroundColor: "#211F25",
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#EAE9ED",
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    color: "#77747C",
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#211F25",
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: 32,
    gap: 12,
  },
  quickSection: {
    gap: 10,
  },
  sectionSubtitle: {
    color: "#85838A",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  quickGrid: {
    gap: 8,
  },
  quickCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EAE9ED",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quickEmoji: {
    fontSize: 22,
  },
  quickInfo: {
    flex: 1,
    gap: 2,
  },
  quickName: {
    color: "#211F25",
    fontSize: 14,
    fontWeight: "700",
  },
  quickServing: {
    color: "#85838A",
    fontSize: 12,
  },
  quickNutrients: {
    alignItems: "flex-end",
    gap: 2,
  },
  quickCal: {
    color: "#211F25",
    fontSize: 13,
    fontWeight: "800",
  },
  quickMacro: {
    color: "#85838A",
    fontSize: 11,
    fontWeight: "600",
  },
  usdaSection: {
    gap: 10,
  },
  resultsList: {
    gap: 8,
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EAE9ED",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  resultInfo: {
    flex: 1,
    gap: 3,
  },
  resultTitle: {
    color: "#211F25",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  resultMeta: {
    color: "#85838A",
    fontSize: 12,
  },
  selectBadge: {
    backgroundColor: "#F4F3F7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectBadgeText: {
    color: "#211F25",
    fontSize: 12,
    fontWeight: "700",
  },
  statusBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#EAE9ED",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  statusTitle: {
    color: "#211F25",
    fontSize: 15,
    fontWeight: "700",
  },
  statusSubtitle: {
    color: "#85838A",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 260,
  },
  statusText: {
    color: "#77747C",
    fontSize: 13,
    fontWeight: "600",
  },
  promptIcon: {
    fontSize: 28,
  },
  emptyIcon: {
    fontSize: 28,
  },
  errorBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#FBD5D5",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  errorIcon: {
    fontSize: 28,
  },
  errorTitle: {
    color: "#9B1C1C",
    fontSize: 15,
    fontWeight: "700",
  },
  errorSubtitle: {
    color: "#77747C",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 4,
    backgroundColor: "#211F25",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.8,
  },
});
