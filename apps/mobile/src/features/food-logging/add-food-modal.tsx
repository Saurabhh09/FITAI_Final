import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../auth/auth-context";
import {
  type BackendMealType,
  type CanonicalFoodDetail,
  type FoodSearchResult,
  type MealTypeDisplay,
  type QuickFoodItem,
} from "./food-domain";
import {
  fetchFoodDetailApi,
  logMealItemApi,
  searchFoodsApi,
} from "./food-api";
import { FoodSearchView } from "./food-search-view";
import { FoodDetailView } from "./food-detail-view";

type TargetFood =
  | { type: "usda"; food: CanonicalFoodDetail }
  | { type: "quick"; food: QuickFoodItem };

type AddFoodModalProps = {
  visible: boolean;
  selectedDate: string;
  initialMealType?: MealTypeDisplay;
  onClose: () => void;
  onSuccess: () => void;
};

export function AddFoodModal({
  visible,
  selectedDate,
  initialMealType = "Breakfast",
  onClose,
  onSuccess,
}: AddFoodModalProps) {
  const { session } = useAuth();
  const accessToken = session?.access_token || "";

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Detail & Selection state
  const [target, setTarget] = useState<TargetFood | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function resetState() {
    setIsSearching(false);
    setSearchError(null);
    setSearchResults([]);
    setHasSearched(false);
    setTarget(null);
    setIsLoadingDetail(false);
    setIsSaving(false);
    setSaveError(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function handleSearch(query: string) {
    if (!accessToken) {
      setSearchError("Authentication expired. Please sign in again.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    const result = await searchFoodsApi(query, accessToken);
    setIsSearching(false);
    setHasSearched(true);

    if (result.ok) {
      setSearchResults(result.data);
    } else {
      setSearchError(result.error);
    }
  }

  async function handleSelectUsda(fdcId: string) {
    if (!accessToken) {
      setSearchError("Authentication expired. Please sign in again.");
      return;
    }

    setIsLoadingDetail(true);
    setSearchError(null);
    const result = await fetchFoodDetailApi(fdcId, accessToken);
    setIsLoadingDetail(false);

    if (result.ok) {
      setTarget({ type: "usda", food: result.data });
      setSaveError(null);
    } else {
      setSearchError(result.error);
    }
  }

  function handleSelectQuick(food: QuickFoodItem) {
    setTarget({ type: "quick", food });
    setSaveError(null);
  }

  async function handleConfirmLog(params: {
    mealType: BackendMealType;
    quantityGrams: number;
    servingDescription: string;
    foodId?: string;
    fdcId?: string;
    quickFoodId?: string;
    nameSnapshot: string;
  }) {
    if (!accessToken) {
      setSaveError("Authentication expired. Please sign in again.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const result = await logMealItemApi(
      {
        date: selectedDate,
        mealType: params.mealType,
        quantityGrams: params.quantityGrams,
        servingDescription: params.servingDescription,
        foodId: params.foodId,
        fdcId: params.fdcId,
        quickFoodId: params.quickFoodId,
        nameSnapshot: params.nameSnapshot,
      },
      accessToken
    );

    setIsSaving(false);

    if (result.ok) {
      resetState();
      onSuccess();
    } else {
      setSaveError(result.error);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {isLoadingDetail ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#211F25" />
            <Text style={styles.loadingText}>Fetching food details from USDA...</Text>
          </View>
        ) : target ? (
          <FoodDetailView
            target={target}
            selectedDate={selectedDate}
            initialMealType={initialMealType}
            isSaving={isSaving}
            saveError={saveError}
            onBack={() => {
              setTarget(null);
              setSaveError(null);
            }}
            onConfirm={handleConfirmLog}
          />
        ) : (
          <FoodSearchView
            isSearching={isSearching}
            searchError={searchError}
            searchResults={searchResults}
            hasSearched={hasSearched}
            onSearch={handleSearch}
            onSelectUsdaFood={handleSelectUsda}
            onSelectQuickFood={handleSelectQuick}
            onClose={handleClose}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F7FB",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#77747C",
    fontSize: 14,
    fontWeight: "600",
  },
});
