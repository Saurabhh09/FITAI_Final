import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAuth } from "../auth/auth-context";

function getImagePicker() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-image-picker") as typeof import("expo-image-picker");
  } catch {
    return null;
  }
}
import {
  type MealAnalysisResult,
  type ScanStep,
  executeMealScanPipeline,
  pollMealScanResult,
  saveMealScanPending,
  triggerMealScanTask,
  uploadMealImageToImageKit,
} from "./services/meal-scan-service";
import { checkIsFoodImage } from "./services/food-classifier-service";
import { logScannedMealToDiaryApi } from "../food-logging/food-api";
import type { BackendMealType } from "../food-logging/food-domain";

type CameraScreenProps = {
  onOpenManualLog?: () => void;
  onMealLogged?: () => void;
};

export function CameraScreen({ onOpenManualLog, onMealLogged }: CameraScreenProps) {
  const { user, session } = useAuth();
  const userId = user?.id || session?.user?.id || "local-user";

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [torchOn, setTorchOn] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ uri: string; base64?: string } | null>(
    null
  );

  // Scan lifecycle states
  const [scanStep, setScanStep] = useState<ScanStep>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [analyzedMeal, setAnalyzedMeal] = useState<MealAnalysisResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [notFoodDetectedItem, setNotFoodDetectedItem] = useState<string>("");

  // Logging state
  const [isLogging, setIsLogging] = useState(false);
  const [loggedSuccess, setLoggedSuccess] = useState(false);

  // 1. Permission Loading State
  if (!permission) {
    return (
      <SafeAreaView style={styles.darkContainer} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#52B6BD" />
          <Text style={styles.loadingText}>Initializing camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Permission Not Granted State
  if (!permission.granted) {
    const isPermanentlyDenied = !permission.canAskAgain;

    return (
      <SafeAreaView style={styles.darkContainer} edges={["top"]}>
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>AI Food Scanner</Text>
          <View style={styles.visionBadge}>
            <Text style={styles.visionBadgeText}>✨ FITAI Vision</Text>
          </View>
        </View>

        <View style={styles.permissionCard}>
          <View style={styles.cameraCircleOuter}>
            <View style={styles.cameraCircleInner}>
              <Text style={styles.cameraIconEmoji}>📷</Text>
            </View>
          </View>

          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionDesc}>
            FITAI needs camera access to scan your meals, recognize ingredients, and estimate
            calories and macronutrients instantly.
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>🍽️</Text>
              <Text style={styles.featureText}>Instant meal & ingredient recognition</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>⚡</Text>
              <Text style={styles.featureText}>Real-time calorie & macro calculation</Text>
            </View>
          </View>

          {isPermanentlyDenied ? (
            <View style={styles.deniedWrapper}>
              <Text style={styles.deniedHint}>
                Camera permission is disabled in your system settings. Please enable it to use the
                food scanner.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
                onPress={() => Linking.openSettings()}
              >
                <Text style={styles.primaryBtnText}>Open App Settings</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
              onPress={() => requestPermission()}
            >
              <Text style={styles.primaryBtnText}>Allow Camera Access</Text>
            </Pressable>
          )}

          {/* Fallback to gallery even if camera is denied */}
          <Pressable
            style={({ pressed }) => [styles.galleryFallbackBtn, pressed && styles.btnPressed]}
            onPress={handlePickFromGallery}
          >
            <Text style={styles.galleryFallbackText}>🖼️ Or Pick Photo from Gallery</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // 3. Media Library / Gallery Picker
  async function handlePickFromGallery() {
    try {
      const picker = getImagePicker();
      if (!picker || !picker.launchImageLibraryAsync) {
        Alert.alert(
          "Gallery Setup Notice",
          "Gallery photo picking requires rebuilding the mobile dev client with the new native image picker module. You can rebuild by running 'npx expo run:android' in your terminal. Live camera scanning is ready now!"
        );
        return;
      }

      const { status } = await picker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library access is needed to select meal pictures."
        );
        return;
      }

      const result = await picker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImage({
          uri: asset.uri,
          base64: asset.base64 || undefined,
        });
        setScanError(null);
      }
    } catch (err: any) {
      Alert.alert("Gallery Error", err.message || "Failed to open photo library.");
    }
  }

  // 4A. Capture Photo only (freezes screen in Review Mode, does NOT start backend work)
  async function handleCapturePhoto() {
    setScanError(null);
    if (!cameraRef.current) {
      setScanError("Camera is not ready yet. Please try again.");
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
        skipProcessing: false,
      });

      if (!photo || !photo.base64) {
        throw new Error("Failed to capture photo from camera.");
      }

      setSelectedImage({ uri: photo.uri, base64: photo.base64 });
    } catch (err: any) {
      setScanError(err.message || "Failed to capture photo.");
    }
  }

  // 4B. Retake Photo (discards picture and returns to live camera)
  function handleRetake() {
    setSelectedImage(null);
    setScanError(null);
    setStatusMessage("");
    setScanStep("idle");
    setNotFoodDetectedItem("");
  }

  // 4C. Proceed with Backend Pipeline (Pre-flight Food Check -> ImageKit -> Supabase -> Gemini Vision 4-Macros)
  async function handleProceed() {
    if (!selectedImage || !selectedImage.base64) {
      setScanError("No image selected to analyze. Please take or pick a photo.");
      return;
    }

    setScanError(null);
    setScanStep("checking_food");
    setStatusMessage("Checking photo for food...");

    try {
      // Step 1: Pre-flight food classification gate
      // Halts immediately if the image contains a non-food item (prevents ImageKit and Trigger.dev usage)
      const foodCheck = await checkIsFoodImage(selectedImage.base64);
      if (!foodCheck.isFood) {
        setNotFoodDetectedItem(foodCheck.detectedItem || "Non-food item");
        setScanStep("not_food");
        return;
      }

      // Step 2: Valid food photo detected - proceed with ImageKit upload and Trigger.dev background task
      setScanStep("uploading");
      setStatusMessage("Saving image to ImageKit...");

      const result = await executeMealScanPipeline({
        base64Image: selectedImage.base64,
        userId,
        onStepChange: (status) => setStatusMessage(status),
      });

      if (!result.ok || !result.analysis) {
        throw new Error(result.error || "AI could not recognize meal items.");
      }

      // Step 3: Secondary guard in case deep vision determined it is not food
      if (
        result.analysis.is_food === false ||
        result.analysis.confidence_score === 0 ||
        result.analysis.meal_name.toLowerCase().includes("non-food")
      ) {
        setNotFoodDetectedItem(result.analysis.meal_name);
        setScanStep("not_food");
        return;
      }

      setAnalyzedMeal(result.analysis);
      setScanStep("completed");
    } catch (err: any) {
      setScanError(err.message || "An unexpected error occurred during meal scanning.");
      setScanStep("error");
    }
  }

  // 5. Log Analyzed Meal to Today's Diary
  async function handleLogToDiary() {
    if (!analyzedMeal) return;

    setIsLogging(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const hour = new Date().getHours();
      let defaultMealType: BackendMealType = "lunch";
      if (hour < 11) defaultMealType = "breakfast";
      else if (hour >= 17) defaultMealType = "dinner";

      const totalWeight =
        analyzedMeal.items?.reduce((sum, it) => sum + (it.weight_g || 0), 0) || 250;

      const res = await logScannedMealToDiaryApi({
        date: today,
        mealType: defaultMealType,
        mealName: analyzedMeal.meal_name,
        calories: analyzedMeal.total_calories,
        protein: analyzedMeal.total_protein_g,
        carbs: analyzedMeal.total_carbs_g,
        fat: analyzedMeal.total_fat_g,
        fiber: analyzedMeal.total_fiber_g,
        totalWeightGrams: totalWeight,
      });

      if (!res.ok) {
        throw new Error(res.error || "Failed to log meal items.");
      }

      setLoggedSuccess(true);
      setTimeout(() => {
        setIsLogging(false);
        handleResetScan();
        if (onMealLogged) {
          onMealLogged();
        }
      }, 1000);
    } catch (err: any) {
      setIsLogging(false);
      Alert.alert("Log Error", err.message || "Failed to log meal items.");
    }
  }

  function handleResetScan() {
    setSelectedImage(null);
    setScanStep("idle");
    setStatusMessage("");
    setAnalyzedMeal(null);
    setScanError(null);
    setLoggedSuccess(false);
    setNotFoodDetectedItem("");
  }

  const isBusy = scanStep !== "idle" && scanStep !== "completed" && scanStep !== "error" && scanStep !== "not_food";

  return (
    <View style={styles.cameraContainer}>
      {/* Live Camera Viewfinder (hidden if a gallery image is selected) */}
      {!selectedImage ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torchOn}
        />
      ) : (
        <Image
          source={{ uri: selectedImage.uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

      {/* Floating Dark Overlays */}
      <SafeAreaView style={styles.overlayContainer} edges={["top"]}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={[styles.liveIndicator, selectedImage && styles.galleryIndicator]} />
            <Text style={styles.topBarTitle}>
              {selectedImage ? "Review Meal Photo" : "Scan Meal"}
            </Text>
          </View>

          <View style={styles.topBarActions}>
            {!selectedImage && (
              <Pressable
                style={({ pressed }) => [
                  styles.headerIconBtn,
                  torchOn && styles.headerIconBtnActive,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => setTorchOn((prev) => !prev)}
                hitSlop={8}
              >
                <Text style={styles.headerIconText}>{torchOn ? "🔦 On" : "⚡ Flash"}</Text>
              </Pressable>
            )}

            {selectedImage && (
              <Pressable
                style={({ pressed }) => [styles.headerIconBtn, pressed && styles.btnPressed]}
                onPress={handleRetake}
                hitSlop={8}
              >
                <Text style={styles.headerIconText}>✕ Clear</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Central Scan Frame & Reticle (hidden in Review mode) */}
        {!selectedImage && (
          <View style={styles.viewfinderCenter}>
            <View style={styles.reticleBox}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              {/* Central Guidance Hint */}
              <View style={styles.reticleHintWrap}>
                <Text style={styles.reticleHintText}>Align food plate inside the frame</Text>
              </View>
            </View>
          </View>
        )}

        {/* Bottom Action Area */}
        <View style={styles.bottomArea}>
          {/* Review mode guidance text - positioned nicely right above Retake & Proceed */}
          {selectedImage && !isBusy && (
            <View style={styles.reviewPromptWrap}>
              <Text style={styles.reviewPromptText}>
                Check photo clarity, then tap Proceed or Retake
              </Text>
            </View>
          )}

          {/* Progress Banner during scan processing */}
          {isBusy && (
            <View style={styles.statusBanner}>
              <ActivityIndicator size="small" color="#52B6BD" />
              <Text style={styles.statusBannerText}>{statusMessage}</Text>
            </View>
          )}

          {scanError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️ {scanError}</Text>
              <Pressable onPress={() => setScanError(null)} hitSlop={10}>
                <Text style={styles.errorDismissText}>Dismiss</Text>
              </Pressable>
            </View>
          )}

          {/* Action Buttons: Mode 1 (Capture) vs Mode 2 (Retake & Proceed) */}
          {!selectedImage ? (
            /* Mode 1: Live Viewfinder Controls */
            <View style={styles.actionsRow}>
              {/* Gallery Upload Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.galleryBtn,
                  pressed && styles.btnPressed,
                  isBusy && styles.btnDisabled,
                ]}
                onPress={handlePickFromGallery}
                disabled={isBusy}
                accessibilityLabel="Choose photo from gallery"
              >
                <Text style={styles.galleryBtnIcon}>🖼️</Text>
                <Text style={styles.galleryBtnLabel}>Gallery</Text>
              </Pressable>

              {/* Capture Food Shutter Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.captureBtn,
                  pressed && styles.btnPressed,
                  isBusy && styles.btnDisabled,
                ]}
                onPress={handleCapturePhoto}
                disabled={isBusy}
                accessibilityLabel="Capture meal photo"
              >
                <View style={styles.captureBtnInner}>
                  <Text style={styles.captureBtnIcon}>📷</Text>
                  <Text style={styles.captureBtnText}>Capture Meal</Text>
                </View>
              </Pressable>
            </View>
          ) : (
            /* Mode 2: Photo Review State (Retake vs Proceed) */
            <View style={styles.reviewActionsRow}>
              {/* Retake Button (Discards picture and reopens live camera) */}
              <Pressable
                style={({ pressed }) => [
                  styles.retakeBtn,
                  pressed && styles.btnPressed,
                  isBusy && styles.btnDisabled,
                ]}
                onPress={handleRetake}
                disabled={isBusy}
                accessibilityLabel="Retake photo"
              >
                <Text style={styles.retakeBtnIcon}>🔄</Text>
                <Text style={styles.retakeBtnText}>Retake</Text>
              </Pressable>

              {/* Proceed Button (Starts backend work: ImageKit, Supabase, AI macros) */}
              <Pressable
                style={({ pressed }) => [
                  styles.proceedBtn,
                  pressed && styles.btnPressed,
                  isBusy && styles.proceedBtnActive,
                ]}
                onPress={handleProceed}
                disabled={isBusy}
                accessibilityLabel="Proceed with meal analysis"
              >
                {isBusy ? (
                  <View style={styles.analyzingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.proceedBtnText}>Analyzing...</Text>
                  </View>
                ) : (
                  <View style={styles.analyzingRow}>
                    <Text style={styles.sparkleIcon}>⚡</Text>
                    <Text style={styles.proceedBtnText}>Proceed</Text>
                  </View>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Analysis Results Modal */}
      <Modal
        visible={scanStep === "completed" && analyzedMeal !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={handleResetScan}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
              {/* Meal Title & Confidence */}
              <View style={styles.resultHeader}>
                <View style={styles.mealTitleBlock}>
                  <Text style={styles.mealNameText}>{analyzedMeal?.meal_name}</Text>
                  {analyzedMeal?.summary ? (
                    <Text style={styles.mealSummaryText}>{analyzedMeal.summary}</Text>
                  ) : null}
                </View>

                {analyzedMeal?.confidence_score !== undefined && (
                  <View style={styles.confidencePill}>
                    <Text style={styles.confidencePillText}>
                      {Math.round(analyzedMeal.confidence_score * 100)}% Match
                    </Text>
                  </View>
                )}
              </View>

              {/* Nutrition Summary Stats Grid */}
              <View style={styles.macrosCard}>
                <View style={styles.caloriesBox}>
                  <Text style={styles.caloriesNumber}>{analyzedMeal?.total_calories || 0}</Text>
                  <Text style={styles.caloriesUnit}>KCAL</Text>
                </View>

                <View style={styles.macroPillRow}>
                  <View style={[styles.macroChip, { borderColor: "#52B6BD" }]}>
                    <Text style={styles.macroChipLabel}>Protein</Text>
                    <Text style={styles.macroChipValue}>{analyzedMeal?.total_protein_g || 0}g</Text>
                  </View>

                  <View style={[styles.macroChip, { borderColor: "#FFA726" }]}>
                    <Text style={styles.macroChipLabel}>Carbs</Text>
                    <Text style={styles.macroChipValue}>{analyzedMeal?.total_carbs_g || 0}g</Text>
                  </View>

                  <View style={[styles.macroChip, { borderColor: "#EF5350" }]}>
                    <Text style={styles.macroChipLabel}>Fat</Text>
                    <Text style={styles.macroChipValue}>{analyzedMeal?.total_fat_g || 0}g</Text>
                  </View>

                  <View style={[styles.macroChip, { borderColor: "#66BB6A" }]}>
                    <Text style={styles.macroChipLabel}>Fiber</Text>
                    <Text style={styles.macroChipValue}>{analyzedMeal?.total_fiber_g || 0}g</Text>
                  </View>
                </View>
              </View>

              {/* Detected Ingredients Section */}
              <Text style={styles.sectionHeading}>Detected Food Items</Text>
              <View style={styles.itemsList}>
                {analyzedMeal?.items?.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPortion}>
                        {item.portion || `${item.weight_g}g`}
                      </Text>
                    </View>
                    <View style={styles.itemNutrients}>
                      <Text style={styles.itemCalories}>{item.calories} kcal</Text>
                      <Text style={styles.itemSubNutrients}>
                        {item.protein_g}P · {item.carbs_g}C · {item.fat_g}F
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.logBtn,
                    loggedSuccess && styles.logBtnSuccess,
                    pressed && styles.btnPressed,
                  ]}
                  onPress={handleLogToDiary}
                  disabled={isLogging || loggedSuccess}
                >
                  {isLogging ? (
                    <ActivityIndicator size="small" color="#111111" />
                  ) : (
                    <Text style={styles.logBtnText}>
                      {loggedSuccess ? "✓ Logged to Today's Diary" : "Log to Diary"}
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.scanAgainBtn, pressed && styles.btnPressed]}
                  onPress={handleResetScan}
                >
                  <Text style={styles.scanAgainBtnText}>Scan Another Meal</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Non-Food Rejection Modal */}
      <Modal
        visible={scanStep === "not_food"}
        animationType="slide"
        transparent={true}
        onRequestClose={handleResetScan}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.notFoodContainer}>
              <View style={styles.notFoodIconBadge}>
                <Text style={styles.notFoodIconText}>🚫🍽️</Text>
              </View>

              <Text style={styles.notFoodTitle}>No Food Detected</Text>

              <Text style={styles.notFoodSubtitle}>
                We couldn't spot any edible food or beverage in this image.
              </Text>

              {notFoodDetectedItem ? (
                <View style={styles.detectedItemChip}>
                  <Text style={styles.detectedItemLabel}>Detected:</Text>
                  <Text style={styles.detectedItemValue}>{notFoodDetectedItem}</Text>
                </View>
              ) : null}

              <View style={styles.tipsCard}>
                <Text style={styles.tipsHeading}>Tips for a clear scan:</Text>
                <Text style={styles.tipItem}>• Position your plate directly inside the frame</Text>
                <Text style={styles.tipItem}>• Ensure the food is well-lit and in focus</Text>
                <Text style={styles.tipItem}>• Avoid photographing screens, furniture, or pets</Text>
              </View>

              <View style={styles.notFoodActions}>
                <Pressable
                  style={({ pressed }) => [styles.primaryRetakeBtn, pressed && styles.btnPressed]}
                  onPress={handleRetake}
                >
                  <Text style={styles.primaryRetakeBtnText}>🔄 Retake Photo</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.secondaryGalleryBtn, pressed && styles.btnPressed]}
                  onPress={handlePickFromGallery}
                >
                  <Text style={styles.secondaryGalleryBtnText}>🖼️ Pick Another Photo</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  darkContainer: {
    flex: 1,
    backgroundColor: "#0D0E12",
    paddingHorizontal: 20,
    justifyContent: "space-between",
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontWeight: "600",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.6,
  },
  visionBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
  visionBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Permission Screen
  permissionCard: {
    backgroundColor: "#16181F",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 24,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  cameraCircleOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(82, 182, 189, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(82, 182, 189, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  cameraCircleInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraIconEmoji: {
    fontSize: 32,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  permissionDesc: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.65)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  featuresList: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureBullet: {
    fontSize: 16,
  },
  featureText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.85)",
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.2,
  },
  galleryFallbackBtn: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  galleryFallbackText: {
    color: "#52B6BD",
    fontSize: 14,
    fontWeight: "700",
  },
  deniedWrapper: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  deniedHint: {
    fontSize: 12,
    color: "rgba(255, 100, 100, 0.9)",
    textAlign: "center",
    lineHeight: 18,
  },
  btnPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  btnDisabled: {
    opacity: 0.5,
  },

  // Live Camera Screen
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  overlayContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(18, 24, 30, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    gap: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34C759",
  },
  galleryIndicator: {
    backgroundColor: "#52B6BD",
  },
  topBarTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBtn: {
    backgroundColor: "rgba(18, 24, 30, 0.75)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  headerIconBtnActive: {
    backgroundColor: "#FFFFFF",
  },
  headerIconText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Center Reticle
  viewfinderCenter: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  reticleBox: {
    width: 280,
    height: 280,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(0, 0, 0, 0.12)",
    position: "relative",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 16,
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#FFFFFF",
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 16,
  },
  reticleHintWrap: {
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  reticleHintText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },

  // Bottom Area & Analyze Food Button
  bottomArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 110,
    gap: 12,
  },
  reviewPromptWrap: {
    backgroundColor: "rgba(18, 20, 26, 0.82)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    marginBottom: 4,
  },
  reviewPromptText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(22, 24, 31, 0.92)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(82, 182, 189, 0.35)",
    gap: 10,
  },
  statusBannerText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(239, 83, 80, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 83, 80, 0.4)",
    width: "100%",
  },
  errorBannerText: {
    color: "#FF8A80",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  errorDismissText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 10,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    width: "100%",
    maxWidth: 360,
  },
  galleryBtn: {
    width: 64,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(22, 24, 31, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  galleryBtnIcon: {
    fontSize: 18,
  },
  galleryBtnLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 1,
  },
  captureBtn: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  captureBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  captureBtnIcon: {
    fontSize: 18,
  },
  captureBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.2,
  },
  reviewActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    width: "100%",
    maxWidth: 360,
  },
  retakeBtn: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.25)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retakeBtnIcon: {
    fontSize: 16,
  },
  retakeBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  proceedBtn: {
    flex: 1.3,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#52B6BD",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#52B6BD",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  proceedBtnActive: {
    backgroundColor: "#3EA0A7",
  },
  proceedBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  analyzeBtn: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  analyzeBtnActive: {
    backgroundColor: "#E2E4E8",
  },
  analyzingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sparkleIcon: {
    fontSize: 18,
  },
  analyzeBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.2,
  },

  // Modal Sheet for Analysis Result (Light Theme matching app design)
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    maxHeight: "88%",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetScroll: {
    paddingBottom: 20,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  mealTitleBlock: {
    flex: 1,
  },
  mealNameText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.4,
  },
  mealSummaryText: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 4,
    lineHeight: 18,
  },
  confidencePill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  confidencePillText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "800",
  },

  // Macros Summary Card
  macrosCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
    alignItems: "center",
    gap: 14,
  },
  caloriesBox: {
    alignItems: "center",
  },
  caloriesNumber: {
    fontSize: 44,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -1,
  },
  caloriesUnit: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D9488",
    letterSpacing: 1.5,
  },
  macroPillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 6,
  },
  macroChip: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    borderWidth: 1.5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  macroChipLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    marginBottom: 3,
  },
  macroChipValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "800",
  },

  // Ingredients Section
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  itemsList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 24,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  itemPortion: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  itemNutrients: {
    alignItems: "flex-end",
  },
  itemCalories: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0D9488",
  },
  itemSubNutrients: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },

  // Modal Actions
  modalActions: {
    gap: 10,
  },
  logBtn: {
    backgroundColor: "#111827",
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logBtnSuccess: {
    backgroundColor: "#16A34A",
  },
  logBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  scanAgainBtn: {
    backgroundColor: "#F1F5F9",
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  scanAgainBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },

  // Non-Food Rejection Modal Styles
  notFoodContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    alignItems: "center",
  },
  notFoodIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  notFoodIconText: {
    fontSize: 36,
  },
  notFoodTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  notFoodSubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  detectedItemChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    marginBottom: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  detectedItemLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  detectedItemValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  tipsCard: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 24,
  },
  tipsHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 20,
  },
  notFoodActions: {
    width: "100%",
    gap: 10,
  },
  primaryRetakeBtn: {
    backgroundColor: "#0F172A",
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryRetakeBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  secondaryGalleryBtn: {
    backgroundColor: "#F1F5F9",
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  secondaryGalleryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
});
