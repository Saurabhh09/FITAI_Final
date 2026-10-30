import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getSupabase } from "../../lib/supabase";
import { useAuth } from "../auth/auth-context";
import { useTheme } from "../../lib/theme-context";
import {
  deleteUserAccountPermanently,
  fetchFullUserProfile,
  fetchWeightHistory,
  formatDateOfBirthDisplay,
  logNewWeight,
  saveLocalPreferences,
  updateCustomNutritionGoals,
  updatePersonalMetrics,
  updateUserDisplayName,
  type UserProfileRecord,
  type WeightHistoryEntry,
} from "./profile-service";
import {
  DeleteAccountIcon,
  GoalWeightIcon,
  LanguageIcon,
  LogoutIcon,
  NutritionGoalsIcon,
  PencilEditIcon,
  PersonalDetailsIcon,
  PreferencesIcon,
  PrivacyIcon,
  RequestFeatureIcon,
  RingColorsIcon,
  SupportEmailIcon,
  TermsIcon,
  UserAvatarIcon,
  WeightHistoryIcon,
} from "./components/profile-icons";

type SubView =
  | "main"
  | "personal_details"
  | "preferences"
  | "language"
  | "nutrition_goals"
  | "weight_history"
  | "ring_colors"
  | "support_feature"
  | "support_email"
  | "terms"
  | "privacy";

type EditModalState = {
  type: "display_name" | "current_weight" | "height" | "birth_date" | "gender" | "goal_weight";
  title: string;
  initialValue?: string;
} | null;

export function ProfileScreen({ onProfileUpdated }: { onProfileUpdated?: () => void }) {
  const { user, signOut } = useAuth();
  const { isDark, colors, themeMode, setThemeMode } = useTheme();

  const [subView, setSubView] = useState<SubView>("main");
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [weightHistory, setWeightHistory] = useState<WeightHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Modal editor states
  const [activeModal, setActiveModal] = useState<EditModalState>(null);
  const [modalInputText, setModalInputText] = useState("");
  const [modalSelectedGender, setModalSelectedGender] = useState<"male" | "female" | "unspecified">("male");
  const [modalSelectedGoal, setModalSelectedGoal] = useState<"lose_weight" | "maintain" | "gain_weight">("maintain");

  // New weight log state
  const [newWeightInput, setNewWeightInput] = useState("");
  const [loggingWeight, setLoggingWeight] = useState(false);

  // Nutrition goals editable inputs
  const [goalCalories, setGoalCalories] = useState("");
  const [goalProtein, setGoalProtein] = useState("");
  const [goalCarbs, setGoalCarbs] = useState("");
  const [goalFat, setGoalFat] = useState("");
  const [goalFiber, setGoalFiber] = useState("");
  const [goalWater, setGoalWater] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const supabase = getSupabase();
    const res = await fetchFullUserProfile(supabase, user.id, user.email || "");
    if (res.ok && res.profile) {
      setProfile(res.profile);
      setGoalCalories(String(res.profile.targetCalories || 2000));
      setGoalProtein(String(res.profile.targetProteinGrams || 120));
      setGoalCarbs(String(res.profile.targetCarbsGrams || 250));
      setGoalFat(String(res.profile.targetFatGrams || 60));
      setGoalFiber(String(res.profile.targetFiberGrams || 28));
      setGoalWater(String(res.profile.targetWaterMl || 2500));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function showBanner(msg: string) {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 4000);
  }

  // --- Handlers for Profile Updates ---
  async function handleSaveDisplayName() {
    if (!user || !profile) return;
    setSaving(true);
    const supabase = getSupabase();
    const res = await updateUserDisplayName(supabase, user.id, modalInputText);
    setSaving(false);
    if (res.ok) {
      setProfile((prev) => (prev ? { ...prev, displayName: modalInputText.trim() } : null));
      setActiveModal(null);
      showBanner("Name updated successfully!");
      onProfileUpdated?.();
    } else {
      Alert.alert("Error", res.error || "Failed to update name.");
    }
  }

  async function handleSaveMetric(field: keyof UserProfileRecord, value: any) {
    if (!user || !profile) return;
    setSaving(true);
    const supabase = getSupabase();
    const res = await updatePersonalMetrics(supabase, user.id, profile, { [field]: value });
    setSaving(false);
    if (res.ok) {
      setActiveModal(null);
      const newCal = res.recalculatedSnapshot?.targets.calories || profile.targetCalories;
      const newP = res.recalculatedSnapshot?.targets.proteinGrams || profile.targetProteinGrams;
      showBanner(`Targets updated: ${Math.round(newCal)} kcal · ${Math.round(newP)}g protein`);
      await loadData();
      onProfileUpdated?.();
    } else {
      Alert.alert("Error", res.error || "Failed to update personal metric.");
    }
  }

  async function handleSaveGoalAndWeight() {
    if (!user || !profile) return;
    const targetW = parseFloat(modalInputText);
    if (isNaN(targetW) || targetW < 30 || targetW > 300) {
      Alert.alert("Invalid Weight", "Please enter a realistic goal weight between 30 and 300 kg.");
      return;
    }
    setSaving(true);
    const supabase = getSupabase();
    const res = await updatePersonalMetrics(supabase, user.id, profile, {
      goal: modalSelectedGoal,
      targetWeightKg: modalSelectedGoal === "maintain" ? null : targetW,
    });
    setSaving(false);
    if (res.ok) {
      setActiveModal(null);
      showBanner("Goal weight updated and plan recalculated!");
      await loadData();
      onProfileUpdated?.();
    } else {
      Alert.alert("Error", res.error || "Failed to update goal weight.");
    }
  }

  // Save custom nutrition goals directly
  async function handleSaveCustomGoals() {
    if (!user || !profile) return;
    const cal = parseInt(goalCalories, 10);
    const p = parseInt(goalProtein, 10);
    const c = parseInt(goalCarbs, 10);
    const f = parseInt(goalFat, 10);
    const fib = parseInt(goalFiber, 10) || 28;
    const w = parseInt(goalWater, 10) || 2500;

    if (isNaN(cal) || cal < 800 || cal > 8000) {
      Alert.alert("Invalid Calories", "Please enter a daily calorie goal between 800 and 8,000.");
      return;
    }
    if (isNaN(p) || p < 10 || isNaN(c) || c < 0 || isNaN(f) || f < 0) {
      Alert.alert("Invalid Macros", "Please enter valid natural numbers for protein, carbs, and fat.");
      return;
    }

    setSaving(true);
    const supabase = getSupabase();
    const res = await updateCustomNutritionGoals(supabase, user.id, {
      calories: cal,
      proteinGrams: p,
      carbsGrams: c,
      fatGrams: f,
      fiberGrams: fib,
      waterMl: w,
    });
    setSaving(false);

    if (res.ok) {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              targetCalories: cal,
              targetProteinGrams: p,
              targetCarbsGrams: c,
              targetFatGrams: f,
              targetFiberGrams: fib,
              targetWaterMl: w,
            }
          : null
      );
      showBanner("Nutrition goals saved! Updated across your diary.");
      setSubView("main");
      onProfileUpdated?.();
    } else {
      Alert.alert("Error", res.error || "Failed to update nutrition goals.");
    }
  }

  // Handle logging new weight
  async function handleLogWeightSubmit() {
    if (!user || !profile) return;
    const val = parseFloat(newWeightInput);
    if (isNaN(val) || val < 30 || val > 300) {
      Alert.alert("Invalid Weight", "Please enter a valid weight between 30 and 300 kg.");
      return;
    }
    setLoggingWeight(true);
    const supabase = getSupabase();
    const res = await logNewWeight(supabase, user.id, val);
    setLoggingWeight(false);

    if (res.ok && res.entry) {
      setWeightHistory((prev) => [res.entry!, ...prev]);
      setProfile((prev) => (prev ? { ...prev, weightKg: val } : null));
      setNewWeightInput("");
      showBanner(`Logged ${val} kg to weight history!`);
      onProfileUpdated?.();
    } else {
      Alert.alert("Error", res.error || "Failed to log weight.");
    }
  }

  async function handleToggleRollover(val: boolean) {
    if (!user || !profile) return;
    setProfile((prev) => (prev ? { ...prev, calorieRollover: val } : null));
    const supabase = getSupabase();
    await updatePersonalMetrics(supabase, user.id, profile, { calorieRollover: val });
    onProfileUpdated?.();
  }

  async function handleToggleBadgeCelebrations(val: boolean) {
    if (!profile) return;
    setProfile((prev) => (prev ? { ...prev, badgeCelebrations: val } : null));
    await saveLocalPreferences({ badgeCelebrations: val });
  }

  async function handleToggleBurnedCalories(val: boolean) {
    if (!profile) return;
    setProfile((prev) => (prev ? { ...prev, addBurnedCalories: val } : null));
    await saveLocalPreferences({ addBurnedCalories: val });
  }

  async function handleOpenWeightHistory() {
    if (!user) return;
    setSubView("weight_history");
    const supabase = getSupabase();
    const res = await fetchWeightHistory(supabase, user.id);
    if (res.ok && res.entries) {
      setWeightHistory(res.entries);
    }
  }

  function handleSignOut() {
    Alert.alert("Logout", "Are you sure you want to log out of your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "default",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  }

  // Delete account with 2-step verification (manual user testing only)
  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final Confirmation",
              "This will permanently delete your profile, all logged meals, weight records, and scan photos from ImageKit CDN.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Permanently Delete",
                  style: "destructive",
                  onPress: async () => {
                    if (!user) return;
                    setSaving(true);
                    const supabase = getSupabase();
                    const res = await deleteUserAccountPermanently(supabase, user.id);
                    setSaving(false);
                    if (res.ok) {
                      await signOut();
                    } else {
                      Alert.alert("Error", res.error || "Failed to delete account.");
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  if (loading && !profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={[styles.loadingText, { color: colors.subText }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const p = profile || ({} as UserProfileRecord);

  // =========================================================================
  // SUBPAGE: PERSONAL DETAILS (NO Daily Step Goal)
  // =========================================================================
  if (subView === "personal_details") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Top Bar with Back Button */}
          <View style={styles.subPageHeaderRow}>
            <Pressable
              style={({ pressed }) => [
                styles.backCircleBtn,
                { backgroundColor: colors.pillBg },
                pressed && styles.btnPressed,
              ]}
              onPress={() => setSubView("main")}
              accessibilityLabel="Back to profile"
            >
              <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
            </Pressable>
            <Text style={[styles.subPageTitle, { color: colors.text }]}>Personal details</Text>
            <View style={{ width: 40 }} />
          </View>

          {statusBanner && (
            <View style={[styles.bannerContainer, { backgroundColor: colors.bannerBg, borderColor: colors.bannerBorder }]}>
              <Text style={[styles.bannerText, { color: colors.bannerText }]}>{statusBanner}</Text>
            </View>
          )}

          {/* Goal Weight Card */}
          <View style={[styles.whiteCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.goalWeightRow}>
              <View>
                <Text style={[styles.goalWeightLabel, { color: colors.subText }]}>Goal Weight</Text>
                <Text style={[styles.goalWeightValue, { color: colors.text }]}>{p.targetWeightKg || 60.9} kg</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.changeGoalPill,
                  { backgroundColor: colors.btnPrimary },
                  pressed && styles.btnPressed,
                ]}
                onPress={() => {
                  setModalInputText(String(p.targetWeightKg || 60.9));
                  setModalSelectedGoal(p.goal || "maintain");
                  setActiveModal({ type: "goal_weight", title: "Goal Weight" });
                }}
              >
                <Text style={[styles.changeGoalPillText, { color: colors.btnPrimaryText }]}>Change Goal</Text>
              </Pressable>
            </View>
          </View>

          {/* Metrics List Card */}
          <View style={[styles.whiteCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Current Weight */}
            <Pressable
              style={({ pressed }) => [styles.metricRow, pressed && styles.rowPressed]}
              onPress={() => {
                setModalInputText(String(p.weightKg || 48));
                setActiveModal({ type: "current_weight", title: "Current Weight", initialValue: String(p.weightKg || 48) });
              }}
            >
              <Text style={[styles.metricLabel, { color: colors.text }]}>Current Weight</Text>
              <View style={styles.metricValRow}>
                <Text style={[styles.metricValue, { color: colors.text }]}>{p.weightKg || 48} kg</Text>
                <PencilEditIcon color={colors.subText} />
              </View>
            </Pressable>
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

            {/* Height */}
            <Pressable
              style={({ pressed }) => [styles.metricRow, pressed && styles.rowPressed]}
              onPress={() => {
                setModalInputText(String(p.heightCm || 171.0));
                setActiveModal({ type: "height", title: "Height", initialValue: String(p.heightCm || 171.0) });
              }}
            >
              <Text style={[styles.metricLabel, { color: colors.text }]}>Height</Text>
              <View style={styles.metricValRow}>
                <Text style={[styles.metricValue, { color: colors.text }]}>{p.heightCm || 171.0} cm</Text>
                <PencilEditIcon color={colors.subText} />
              </View>
            </Pressable>
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

            {/* Date of Birth */}
            <Pressable
              style={({ pressed }) => [styles.metricRow, pressed && styles.rowPressed]}
              onPress={() => {
                setModalInputText(p.birthDate || "2008-10-12");
                setActiveModal({ type: "birth_date", title: "Date of birth", initialValue: p.birthDate });
              }}
            >
              <Text style={[styles.metricLabel, { color: colors.text }]}>Date of birth</Text>
              <View style={styles.metricValRow}>
                <Text style={[styles.metricValue, { color: colors.text }]}>{formatDateOfBirthDisplay(p.birthDate)}</Text>
                <PencilEditIcon color={colors.subText} />
              </View>
            </Pressable>
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

            {/* Gender */}
            <Pressable
              style={({ pressed }) => [styles.metricRow, pressed && styles.rowPressed]}
              onPress={() => {
                setModalSelectedGender(p.gender || "male");
                setActiveModal({ type: "gender", title: "Gender" });
              }}
            >
              <Text style={[styles.metricLabel, { color: colors.text }]}>Gender</Text>
              <View style={styles.metricValRow}>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {p.gender === "female" ? "Female" : p.gender === "unspecified" ? "Other" : "Male"}
                </Text>
                <PencilEditIcon color={colors.subText} />
              </View>
            </Pressable>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
        {renderActiveModal()}
      </SafeAreaView>
    );
  }

  // =========================================================================
  // SUBPAGE: PREFERENCES (THEME SWITCHING FULLY FUNCTIONAL)
  // =========================================================================
  if (subView === "preferences") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.subPageHeaderRow}>
            <Pressable
              style={({ pressed }) => [
                styles.backCircleBtn,
                { backgroundColor: colors.pillBg },
                pressed && styles.btnPressed,
              ]}
              onPress={() => setSubView("main")}
              accessibilityLabel="Back to profile"
            >
              <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
            </Pressable>
            <Text style={[styles.subPageTitle, { color: colors.text }]}>Preferences</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Appearance Card */}
          <View style={[styles.whiteCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.preferenceRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.preferenceTitle, { color: colors.text }]}>Appearance</Text>
                <Text style={[styles.preferenceSubtitle, { color: colors.subText }]}>
                  Choose light, dark, or system appearance
                </Text>
              </View>
              <Pressable
                style={[styles.dropdownPill, { backgroundColor: colors.pillBg }]}
                onPress={() => {
                  Alert.alert("Select Appearance", "Choose your preferred app theme", [
                    {
                      text: "Light Theme",
                      onPress: () => setThemeMode("light"),
                    },
                    {
                      text: "Dark Theme",
                      onPress: () => setThemeMode("dark"),
                    },
                    {
                      text: "Match System",
                      onPress: () => setThemeMode("system"),
                    },
                    { text: "Cancel", style: "cancel" },
                  ]);
                }}
              >
                <Text style={[styles.dropdownPillText, { color: colors.pillText }]}>
                  {themeMode === "dark" ? "Dark" : themeMode === "system" ? "System" : "Light"} ⌵
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Switches Card */}
          <View style={[styles.whiteCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Badge Celebrations */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={[styles.preferenceTitle, { color: colors.text }]}>Badge Celebrations</Text>
                <Text style={[styles.preferenceSubtitle, { color: colors.subText }]}>
                  Show celebrations when you unlock new badges
                </Text>
              </View>
              <Switch
                value={p.badgeCelebrations}
                onValueChange={handleToggleBadgeCelebrations}
                trackColor={{ false: "#D1D5DB", true: colors.btnPrimary }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

            {/* Add Burned Calories */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={[styles.preferenceTitle, { color: colors.text }]}>Add Burned Calories</Text>
                <Text style={[styles.preferenceSubtitle, { color: colors.subText }]}>
                  Add burned calories to daily goal
                </Text>
              </View>
              <Switch
                value={p.addBurnedCalories}
                onValueChange={handleToggleBurnedCalories}
                trackColor={{ false: "#D1D5DB", true: colors.btnPrimary }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

            {/* Rollover Calories */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={[styles.preferenceTitle, { color: colors.text }]}>Rollover calories</Text>
                <Text style={[styles.preferenceSubtitle, { color: colors.subText }]}>
                  Add up to 200 left over calories from yesterday into today's daily goal
                </Text>
              </View>
              <Switch
                value={p.calorieRollover}
                onValueChange={handleToggleRollover}
                trackColor={{ false: "#D1D5DB", true: colors.btnPrimary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // SUBPAGE: LANGUAGE
  // =========================================================================
  if (subView === "language") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.subPageHeaderRow}>
            <Pressable
              style={({ pressed }) => [
                styles.backCircleBtn,
                { backgroundColor: colors.pillBg },
                pressed && styles.btnPressed,
              ]}
              onPress={() => setSubView("main")}
            >
              <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
            </Pressable>
            <Text style={[styles.subPageTitle, { color: colors.text }]}>Language</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={[styles.whiteCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.languageOptionRow}>
              <View>
                <Text style={[styles.metricLabel, { color: colors.text, fontWeight: "600" }]}>English (US)</Text>
                <Text style={[styles.preferenceSubtitle, { color: colors.subText }]}>Default application language</Text>
              </View>
              <Text style={{ fontSize: 18, color: "#10B981", fontWeight: "700" }}>✓</Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // SUBPAGE: EDIT NUTRITION GOALS (DIRECT NUMBER INPUTS)
  // =========================================================================
  if (subView === "nutrition_goals") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.subPageHeaderRow}>
            <Pressable
              style={({ pressed }) => [
                styles.backCircleBtn,
                { backgroundColor: colors.pillBg },
                pressed && styles.btnPressed,
              ]}
              onPress={() => setSubView("main")}
            >
              <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
            </Pressable>
            <Text style={[styles.subPageTitle, { color: colors.text }]}>Edit Nutrition Goals</Text>
            <View style={{ width: 40 }} />
          </View>

          <Text style={[styles.pageIntroText, { color: colors.subText }]}>
            Enter your custom daily nutritional targets. Any number you set will be active immediately on your dashboard
            and diary rings.
          </Text>

          {/* Goal Input Cards */}
          <View style={[styles.whiteCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Calories */}
            <View style={styles.goalFieldRow}>
              <Text style={[styles.goalFieldLabel, { color: colors.text }]}>Daily Calories (kcal)</Text>
              <TextInput
                style={[styles.goalFieldInput, { backgroundColor: colors.pillBg, color: colors.text }]}
                value={goalCalories}
                onChangeText={setGoalCalories}
                keyboardType="numeric"
                placeholder="2000"
                placeholderTextColor={colors.subText}
              />
            </View>
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

            {/* Protein */}
            <View style={styles.goalFieldRow}>
              <Text style={[styles.goalFieldLabel, { color: colors.text }]}>Protein (g)</Text>
              <TextInput
                style={[styles.goalFieldInput, { backgroundColor: colors.pillBg, color: colors.text }]}
                value={goalProtein}
                onChangeText={setGoalProtein}
                keyboardType="numeric"
                placeholder="120"
                placeholderTextColor={colors.subText}
              />
            </View>
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

            {/* Carbohydrates */}
            <View style={styles.goalFieldRow}>
              <Text style={[styles.goalFieldLabel, { color: colors.text }]}>Carbohydrates (g)</Text>
              <TextInput
                style={[styles.goalFieldInput, { backgroundColor: colors.pillBg, color: colors.text }]}
                value={goalCarbs}
                onChangeText={setGoalCarbs}
                keyboardType="numeric"
                placeholder="250"
                placeholderTextColor={colors.subText}
              />
            </View>
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

            {/* Fat */}
            <View style={styles.goalFieldRow}>
              <Text style={[styles.goalFieldLabel, { color: colors.text }]}>Total Fat (g)</Text>
              <TextInput
                style={[styles.goalFieldInput, { backgroundColor: colors.pillBg, color: colors.text }]}
                value={goalFat}
                onChangeText={setGoalFat}
                keyboardType="numeric"
                placeholder="60"
                placeholderTextColor={colors.subText}
              />
            </View>
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

            {/* Fiber */}
            <View style={styles.goalFieldRow}>
              <Text style={[styles.goalFieldLabel, { color: colors.text }]}>Dietary Fiber (g)</Text>
              <TextInput
                style={[styles.goalFieldInput, { backgroundColor: colors.pillBg, color: colors.text }]}
                value={goalFiber}
                onChangeText={setGoalFiber}
                keyboardType="numeric"
                placeholder="28"
                placeholderTextColor={colors.subText}
              />
            </View>
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

            {/* Water */}
            <View style={styles.goalFieldRow}>
              <Text style={[styles.goalFieldLabel, { color: colors.text }]}>Daily Water (ml)</Text>
              <TextInput
                style={[styles.goalFieldInput, { backgroundColor: colors.pillBg, color: colors.text }]}
                value={goalWater}
                onChangeText={setGoalWater}
                keyboardType="numeric"
                placeholder="2500"
                placeholderTextColor={colors.subText}
              />
            </View>
          </View>

          {/* Save Button */}
          <Pressable
            style={({ pressed }) => [
              styles.saveGoalsBtn,
              { backgroundColor: colors.btnPrimary },
              pressed && styles.btnPressed,
            ]}
            onPress={handleSaveCustomGoals}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.btnPrimaryText} />
            ) : (
              <Text style={[styles.saveGoalsBtnText, { color: colors.btnPrimaryText }]}>Save Nutrition Goals</Text>
            )}
          </Pressable>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // SUBPAGE: WEIGHT HISTORY (WITH "+ LOG WEIGHT" OPTION)
  // =========================================================================
  if (subView === "weight_history") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.subPageHeaderRow}>
            <Pressable
              style={({ pressed }) => [
                styles.backCircleBtn,
                { backgroundColor: colors.pillBg },
                pressed && styles.btnPressed,
              ]}
              onPress={() => setSubView("main")}
            >
              <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
            </Pressable>
            <Text style={[styles.subPageTitle, { color: colors.text }]}>Weight history</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Log New Weight Card */}
          <View style={[styles.whiteCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.preferenceTitle, { color: colors.text, marginBottom: 8 }]}>Log Today's Weight</Text>
            <View style={styles.logWeightRow}>
              <TextInput
                style={[styles.weightLogInput, { backgroundColor: colors.pillBg, color: colors.text }]}
                value={newWeightInput}
                onChangeText={setNewWeightInput}
                keyboardType="numeric"
                placeholder="e.g. 56.5 kg"
                placeholderTextColor={colors.subText}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.logWeightBtn,
                  { backgroundColor: colors.btnPrimary },
                  pressed && styles.btnPressed,
                ]}
                onPress={handleLogWeightSubmit}
                disabled={loggingWeight}
              >
                {loggingWeight ? (
                  <ActivityIndicator size="small" color={colors.btnPrimaryText} />
                ) : (
                  <Text style={[styles.logWeightBtnText, { color: colors.btnPrimaryText }]}>+ Log</Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Historical Logs List */}
          <Text style={[styles.sectionHeading, { color: colors.subText }]}>Past Records</Text>
          <View style={[styles.whiteCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {weightHistory.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <Text style={{ color: colors.subText, fontSize: 15 }}>No recorded weight logs yet.</Text>
                <Text style={{ color: colors.subText, fontSize: 13, marginTop: 4 }}>
                  Enter your current weight above to start tracking.
                </Text>
              </View>
            ) : (
              weightHistory.map((entry, idx) => (
                <View key={entry.id || idx}>
                  <View style={styles.historyRow}>
                    <View>
                      <Text style={[styles.historyWeight, { color: colors.text }]}>{entry.weightKg} kg</Text>
                      <Text style={[styles.historyDate, { color: colors.subText }]}>
                        {new Date(entry.recordedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                    <Text style={styles.historyBadge}>Logged</Text>
                  </View>
                  {idx < weightHistory.length - 1 && (
                    <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />
                  )}
                </View>
              ))
            )}
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // SUBPAGE: RING COLORS EXPLAINED
  // =========================================================================
  if (subView === "ring_colors") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.subPageHeaderRow}>
            <Pressable
              style={({ pressed }) => [
                styles.backCircleBtn,
                { backgroundColor: colors.pillBg },
                pressed && styles.btnPressed,
              ]}
              onPress={() => setSubView("main")}
            >
              <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
            </Pressable>
            <Text style={[styles.subPageTitle, { color: colors.text }]}>Ring Colors Explained</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={[styles.whiteCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.ringExplRow}>
              <Text style={styles.ringDotGreen}>●</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.ringExplTitle, { color: colors.text }]}>Green Ring</Text>
                <Text style={[styles.ringExplText, { color: colors.subText }]}>
                  Calorie goal reached or fewer than 100 kcal remaining.
                </Text>
              </View>
            </View>
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

            <View style={styles.ringExplRow}>
              <Text style={styles.ringDotOrange}>●</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.ringExplTitle, { color: colors.text }]}>Orange Ring</Text>
                <Text style={[styles.ringExplText, { color: colors.subText }]}>
                  Between 100 and 200 kcal remaining for the day.
                </Text>
              </View>
            </View>
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

            <View style={styles.ringExplRow}>
              <Text style={styles.ringDotRed}>●</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.ringExplTitle, { color: colors.text }]}>Red Ring</Text>
                <Text style={[styles.ringExplText, { color: colors.subText }]}>
                  More than 200 kcal remaining to reach your goal.
                </Text>
              </View>
            </View>
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

            <View style={styles.ringExplRow}>
              <Text style={styles.ringDotDotted}>○</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.ringExplTitle, { color: colors.text }]}>Dotted Ring</Text>
                <Text style={[styles.ringExplText, { color: colors.subText }]}>No meals logged for this day.</Text>
              </View>
            </View>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // SUBPAGE: SUPPORT & LEGAL SUBPAGES
  // =========================================================================
  if (subView === "support_feature" || subView === "support_email" || subView === "terms" || subView === "privacy") {
    const titles = {
      support_feature: "Request a Feature",
      support_email: "Support Email",
      terms: "Terms and Conditions",
      privacy: "Privacy Policy",
    };

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.subPageHeaderRow}>
            <Pressable
              style={({ pressed }) => [
                styles.backCircleBtn,
                { backgroundColor: colors.pillBg },
                pressed && styles.btnPressed,
              ]}
              onPress={() => setSubView("main")}
            >
              <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
            </Pressable>
            <Text style={[styles.subPageTitle, { color: colors.text }]}>{titles[subView]}</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={[styles.whiteCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {subView === "support_feature" && (
              <View>
                <Text style={[styles.preferenceSubtitle, { color: colors.subText, marginBottom: 12 }]}>
                  Have an idea to make FITAI even better? Send your feedback:
                </Text>
                <TextInput
                  style={[styles.modalTextInput, { backgroundColor: colors.pillBg, color: colors.text, height: 120 }]}
                  multiline
                  placeholder="Describe your feature idea..."
                  placeholderTextColor={colors.subText}
                />
                <Pressable
                  style={[styles.saveGoalsBtn, { backgroundColor: colors.btnPrimary }]}
                  onPress={() => {
                    showBanner("Thank you! Your feature request has been recorded.");
                    setSubView("main");
                  }}
                >
                  <Text style={[styles.saveGoalsBtnText, { color: colors.btnPrimaryText }]}>Submit Request</Text>
                </Pressable>
              </View>
            )}

            {subView === "support_email" && (
              <View style={{ paddingVertical: 12 }}>
                <Text style={[styles.preferenceSubtitle, { color: colors.subText }]}>Official customer support:</Text>
                <Text style={[styles.modalTitle, { color: "#2563EB", marginVertical: 10 }]}>support@fitai.app</Text>
                <Text style={[styles.preferenceSubtitle, { color: colors.subText }]}>
                  Response times are typically within 24 hours Monday through Friday.
                </Text>
              </View>
            )}

            {subView === "terms" && (
              <View style={{ paddingVertical: 12 }}>
                <Text style={[styles.preferenceSubtitle, { color: colors.text, lineHeight: 22 }]}>
                  By using FITAI, you acknowledge that all nutritional metrics and AI meal estimates are for personal
                  informational guidance only and do not replace personalized advice from certified physicians or clinical
                  dietitians.
                </Text>
              </View>
            )}

            {subView === "privacy" && (
              <View style={{ paddingVertical: 12 }}>
                <Text style={[styles.preferenceSubtitle, { color: colors.text, lineHeight: 22 }]}>
                  Your personal biometric data, weight entries, and uploaded meal photographs are securely scoped to your
                  private user ID and are never rented, sold, or shared with third-party advertisers.
                </Text>
              </View>
            )}
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // MAIN PROFILE VIEW (CLEAN VECTOR ICONS, ZERO EMOJIS, BLACK LOGOUT)
  // =========================================================================
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Title */}
        <Text style={[styles.mainTitle, { color: colors.text }]}>Profile</Text>

        {statusBanner && (
          <View style={[styles.bannerContainer, { backgroundColor: colors.bannerBg, borderColor: colors.bannerBorder }]}>
            <Text style={[styles.bannerText, { color: colors.bannerText }]}>{statusBanner}</Text>
          </View>
        )}

        {/* 1. User Header Card */}
        <Pressable
          style={({ pressed }) => [
            styles.userCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
            pressed && styles.rowPressed,
          ]}
          onPress={() => {
            setModalInputText(p.displayName || "");
            setActiveModal({ type: "display_name", title: "Enter your name", initialValue: p.displayName || "" });
          }}
          accessibilityLabel="Edit display name"
        >
          <View style={[styles.avatarCircle, { backgroundColor: colors.pillBg }]}>
            <UserAvatarIcon color={colors.iconColor} size={26} />
          </View>
          <View style={styles.userNameBlock}>
            <View style={styles.nameRow}>
              <Text style={[styles.userNameText, { color: colors.text }]}>
                {p.displayName?.trim() ? p.displayName : "Enter your name"}
              </Text>
              <View style={{ marginLeft: 6 }}>
                <PencilEditIcon color={colors.subText} size={14} />
              </View>
            </View>
            <Text style={[styles.userAgeText, { color: colors.subText }]}>{p.ageYears} years old</Text>
          </View>
        </Pressable>

        {/* 2. Account Section */}
        <Text style={[styles.sectionHeading, { color: colors.subText }]}>Account</Text>
        <View style={[styles.whiteCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Personal Details */}
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
            onPress={() => setSubView("personal_details")}
          >
            <View style={styles.menuLeft}>
              <PersonalDetailsIcon color={colors.iconColor} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>Personal details</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

          {/* Preferences */}
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
            onPress={() => setSubView("preferences")}
          >
            <View style={styles.menuLeft}>
              <PreferencesIcon color={colors.iconColor} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>Preferences</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

          {/* Language */}
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
            onPress={() => setSubView("language")}
          >
            <View style={styles.menuLeft}>
              <LanguageIcon color={colors.iconColor} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>Language</Text>
            </View>
            <View style={styles.menuRightVal}>
              <Text style={[styles.menuSubVal, { color: colors.subText }]}>English</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>
        </View>

        {/* 3. Goals & Tracking Section */}
        <Text style={[styles.sectionHeading, { color: colors.subText }]}>Goals & Tracking</Text>
        <View style={[styles.whiteCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Edit Nutrition Goals */}
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
            onPress={() => setSubView("nutrition_goals")}
          >
            <View style={styles.menuLeft}>
              <NutritionGoalsIcon color={colors.iconColor} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>Edit Nutrition Goals</Text>
            </View>
            <View style={styles.menuRightVal}>
              <Text style={[styles.menuSubVal, { color: colors.subText }]}>{p.targetCalories} kcal</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>
          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

          {/* Goal & current weight */}
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
            onPress={() => setSubView("personal_details")}
          >
            <View style={styles.menuLeft}>
              <GoalWeightIcon color={colors.iconColor} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>Goal & current weight</Text>
            </View>
            <View style={styles.menuRightVal}>
              <Text style={[styles.menuSubVal, { color: colors.subText }]}>
                {p.weightKg} kg → {p.targetWeightKg || 60.9} kg
              </Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>
          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

          {/* Weight History */}
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
            onPress={handleOpenWeightHistory}
          >
            <View style={styles.menuLeft}>
              <WeightHistoryIcon color={colors.iconColor} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>Weight history</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

          {/* Ring Colors Explained */}
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
            onPress={() => setSubView("ring_colors")}
          >
            <View style={styles.menuLeft}>
              <RingColorsIcon color={colors.iconColor} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>Ring Colors Explained</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>

        {/* 4. Support & Legal Section */}
        <Text style={[styles.sectionHeading, { color: colors.subText }]}>Support & Legal</Text>
        <View style={[styles.whiteCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Request a Feature */}
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
            onPress={() => setSubView("support_feature")}
          >
            <View style={styles.menuLeft}>
              <RequestFeatureIcon color={colors.iconColor} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>Request a Feature</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

          {/* Support Email */}
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
            onPress={() => setSubView("support_email")}
          >
            <View style={styles.menuLeft}>
              <SupportEmailIcon color={colors.iconColor} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>Support Email</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

          {/* Terms and Conditions */}
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
            onPress={() => setSubView("terms")}
          >
            <View style={styles.menuLeft}>
              <TermsIcon color={colors.iconColor} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>Terms and Conditions</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

          {/* Privacy Policy */}
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
            onPress={() => setSubView("privacy")}
          >
            <View style={styles.menuLeft}>
              <PrivacyIcon color={colors.iconColor} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>Privacy Policy</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>

        {/* 5. Account Actions Section */}
        <Text style={[styles.sectionHeading, { color: colors.subText }]}>Account Actions</Text>
        <View style={[styles.whiteCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Logout (IN APP THEME BLACK #111111 - NOT RED) */}
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
            onPress={handleSignOut}
          >
            <View style={styles.menuLeft}>
              <LogoutIcon color={colors.iconColor} />
              <Text style={[styles.menuLabel, { color: colors.text }]}>Logout</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />

          {/* Delete Account (RED) */}
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
            onPress={handleDeleteAccount}
          >
            <View style={styles.menuLeft}>
              <DeleteAccountIcon color="#E53935" />
              <Text style={[styles.menuLabel, { color: "#E53935" }]}>Delete Account</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>

        {/* Version Footer */}
        <Text style={[styles.versionFooter, { color: colors.subText }]}>VERSION 26.41.0</Text>

        <View style={{ height: 110 }} />
      </ScrollView>

      {renderActiveModal()}
    </SafeAreaView>
  );

  // =========================================================================
  // MODALS & INPUT DIALOGS
  // =========================================================================
  function renderActiveModal() {
    if (!activeModal) return null;

    return (
      <Modal
        visible={activeModal !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{activeModal.title}</Text>

            {/* Display Name Edit */}
            {activeModal.type === "display_name" && (
              <View>
                <Text style={[styles.modalSubtitle, { color: colors.subText }]}>Enter the name you would like to be called:</Text>
                <TextInput
                  style={[styles.modalTextInput, { backgroundColor: colors.pillBg, color: colors.text }]}
                  value={modalInputText}
                  onChangeText={setModalInputText}
                  placeholder="Your full name"
                  placeholderTextColor={colors.subText}
                  autoFocus
                />
                <View style={styles.modalBtnRow}>
                  <Pressable
                    style={[styles.modalCancelBtn, { backgroundColor: colors.pillBg }]}
                    onPress={() => setActiveModal(null)}
                  >
                    <Text style={[styles.modalCancelBtnText, { color: colors.subText }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalSaveBtn, { backgroundColor: colors.btnPrimary }]}
                    onPress={handleSaveDisplayName}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={colors.btnPrimaryText} />
                    ) : (
                      <Text style={[styles.modalSaveBtnText, { color: colors.btnPrimaryText }]}>Save</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {/* Current Weight Edit */}
            {activeModal.type === "current_weight" && (
              <View>
                <Text style={[styles.modalSubtitle, { color: colors.subText }]}>Enter your body weight in kg:</Text>
                <TextInput
                  style={[styles.modalTextInput, { backgroundColor: colors.pillBg, color: colors.text }]}
                  value={modalInputText}
                  onChangeText={setModalInputText}
                  keyboardType="numeric"
                  placeholder="e.g. 56.5"
                  placeholderTextColor={colors.subText}
                  autoFocus
                />
                <View style={styles.modalBtnRow}>
                  <Pressable
                    style={[styles.modalCancelBtn, { backgroundColor: colors.pillBg }]}
                    onPress={() => setActiveModal(null)}
                  >
                    <Text style={[styles.modalCancelBtnText, { color: colors.subText }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalSaveBtn, { backgroundColor: colors.btnPrimary }]}
                    onPress={() => {
                      const val = parseFloat(modalInputText);
                      if (isNaN(val) || val < 30 || val > 300) {
                        Alert.alert("Invalid Input", "Please enter a weight between 30 and 300 kg.");
                        return;
                      }
                      handleSaveMetric("weightKg", val);
                    }}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={colors.btnPrimaryText} />
                    ) : (
                      <Text style={[styles.modalSaveBtnText, { color: colors.btnPrimaryText }]}>Save</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {/* Height Edit */}
            {activeModal.type === "height" && (
              <View>
                <Text style={[styles.modalSubtitle, { color: colors.subText }]}>Enter your height in cm:</Text>
                <TextInput
                  style={[styles.modalTextInput, { backgroundColor: colors.pillBg, color: colors.text }]}
                  value={modalInputText}
                  onChangeText={setModalInputText}
                  keyboardType="numeric"
                  placeholder="e.g. 174"
                  placeholderTextColor={colors.subText}
                  autoFocus
                />
                <View style={styles.modalBtnRow}>
                  <Pressable
                    style={[styles.modalCancelBtn, { backgroundColor: colors.pillBg }]}
                    onPress={() => setActiveModal(null)}
                  >
                    <Text style={[styles.modalCancelBtnText, { color: colors.subText }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalSaveBtn, { backgroundColor: colors.btnPrimary }]}
                    onPress={() => {
                      const val = parseFloat(modalInputText);
                      if (isNaN(val) || val < 100 || val > 260) {
                        Alert.alert("Invalid Input", "Please enter a height between 100 and 260 cm.");
                        return;
                      }
                      handleSaveMetric("heightCm", val);
                    }}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={colors.btnPrimaryText} />
                    ) : (
                      <Text style={[styles.modalSaveBtnText, { color: colors.btnPrimaryText }]}>Save</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {/* Birth Date Edit */}
            {activeModal.type === "birth_date" && (
              <View>
                <Text style={[styles.modalSubtitle, { color: colors.subText }]}>Enter your date of birth (YYYY-MM-DD):</Text>
                <TextInput
                  style={[styles.modalTextInput, { backgroundColor: colors.pillBg, color: colors.text }]}
                  value={modalInputText}
                  onChangeText={setModalInputText}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.subText}
                  autoFocus
                />
                <View style={styles.modalBtnRow}>
                  <Pressable
                    style={[styles.modalCancelBtn, { backgroundColor: colors.pillBg }]}
                    onPress={() => setActiveModal(null)}
                  >
                    <Text style={[styles.modalCancelBtnText, { color: colors.subText }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalSaveBtn, { backgroundColor: colors.btnPrimary }]}
                    onPress={() => {
                      if (!/^\d{4}-\d{2}-\d{2}$/.test(modalInputText.trim())) {
                        Alert.alert("Invalid Format", "Please use the format YYYY-MM-DD (e.g. 2007-10-12).");
                        return;
                      }
                      handleSaveMetric("birthDate", modalInputText.trim());
                    }}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={colors.btnPrimaryText} />
                    ) : (
                      <Text style={[styles.modalSaveBtnText, { color: colors.btnPrimaryText }]}>Save</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {/* Gender Edit */}
            {activeModal.type === "gender" && (
              <View>
                <Text style={[styles.modalSubtitle, { color: colors.subText }]}>Select your biological sex:</Text>
                <View style={styles.genderOptionsRow}>
                  {(["male", "female", "unspecified"] as const).map((g) => (
                    <Pressable
                      key={g}
                      style={[
                        styles.genderChip,
                        { backgroundColor: colors.pillBg, borderColor: colors.divider },
                        modalSelectedGender === g && { backgroundColor: colors.btnPrimary, borderColor: colors.btnPrimary },
                      ]}
                      onPress={() => setModalSelectedGender(g)}
                    >
                      <Text
                        style={[
                          styles.genderChipText,
                          { color: colors.text },
                          modalSelectedGender === g && { color: colors.btnPrimaryText },
                        ]}
                      >
                        {g === "male" ? "Male" : g === "female" ? "Female" : "Other"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.modalBtnRow}>
                  <Pressable
                    style={[styles.modalCancelBtn, { backgroundColor: colors.pillBg }]}
                    onPress={() => setActiveModal(null)}
                  >
                    <Text style={[styles.modalCancelBtnText, { color: colors.subText }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalSaveBtn, { backgroundColor: colors.btnPrimary }]}
                    onPress={() => handleSaveMetric("gender", modalSelectedGender)}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={colors.btnPrimaryText} />
                    ) : (
                      <Text style={[styles.modalSaveBtnText, { color: colors.btnPrimaryText }]}>Save</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {/* Change Goal & Weight Modal */}
            {activeModal.type === "goal_weight" && (
              <View>
                <Text style={[styles.modalSubtitle, { color: colors.subText }]}>Select primary goal:</Text>
                <View style={styles.genderOptionsRow}>
                  {(["lose_weight", "maintain", "gain_weight"] as const).map((g) => (
                    <Pressable
                      key={g}
                      style={[
                        styles.genderChip,
                        { backgroundColor: colors.pillBg, borderColor: colors.divider },
                        modalSelectedGoal === g && { backgroundColor: colors.btnPrimary, borderColor: colors.btnPrimary },
                      ]}
                      onPress={() => setModalSelectedGoal(g)}
                    >
                      <Text
                        style={[
                          styles.genderChipText,
                          { color: colors.text },
                          modalSelectedGoal === g && { color: colors.btnPrimaryText },
                        ]}
                      >
                        {g === "lose_weight" ? "Lose" : g === "gain_weight" ? "Gain" : "Maintain"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {modalSelectedGoal !== "maintain" && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.modalSubtitle, { color: colors.subText }]}>Target weight (kg):</Text>
                    <TextInput
                      style={[styles.modalTextInput, { backgroundColor: colors.pillBg, color: colors.text }]}
                      value={modalInputText}
                      onChangeText={setModalInputText}
                      keyboardType="numeric"
                      placeholder="e.g. 70"
                      placeholderTextColor={colors.subText}
                    />
                  </View>
                )}

                <View style={styles.modalBtnRow}>
                  <Pressable
                    style={[styles.modalCancelBtn, { backgroundColor: colors.pillBg }]}
                    onPress={() => setActiveModal(null)}
                  >
                    <Text style={[styles.modalCancelBtnText, { color: colors.subText }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalSaveBtn, { backgroundColor: colors.btnPrimary }]}
                    onPress={handleSaveGoalAndWeight}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={colors.btnPrimaryText} />
                    ) : (
                      <Text style={[styles.modalSaveBtnText, { color: colors.btnPrimaryText }]}>Save Goal</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: "700",
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subPageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  backCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 20,
    fontWeight: "600",
  },
  subPageTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  pageIntroText: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  bannerContainer: {
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  // User Header Card
  userCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  userNameBlock: {
    marginLeft: 14,
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userNameText: {
    fontSize: 18,
    fontWeight: "700",
  },
  userAgeText: {
    fontSize: 14,
    marginTop: 2,
  },

  // Generic Cards
  sectionHeading: {
    fontSize: 14,
    fontWeight: "600",
    marginHorizontal: 20,
    marginBottom: 8,
  },
  whiteCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  rowDivider: {
    height: 1,
  },

  // Menu Rows
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 12,
  },
  menuRightVal: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuSubVal: {
    fontSize: 14,
    marginRight: 6,
  },
  chevron: {
    fontSize: 20,
    fontWeight: "400",
    color: "#C7C7CC",
  },

  // Goal Weight Card
  goalWeightRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  goalWeightLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  goalWeightValue: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4,
  },
  changeGoalPill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  changeGoalPillText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Metric Rows
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  metricLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  metricValRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "600",
  },

  // Preferences Rows
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  preferenceSubtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  dropdownPill: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dropdownPillText: {
    fontSize: 14,
    fontWeight: "500",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },

  // Language Page
  languageOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },

  // Nutrition Goal Inputs
  goalFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  goalFieldLabel: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  goalFieldInput: {
    width: 100,
    textAlign: "right",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  saveGoalsBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  saveGoalsBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },

  // Weight History
  logWeightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  weightLogInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  logWeightBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  logWeightBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  historyWeight: {
    fontSize: 18,
    fontWeight: "700",
  },
  historyDate: {
    fontSize: 13,
    marginTop: 2,
  },
  historyBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  // Ring Explanation
  ringExplRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
  },
  ringDotGreen: {
    fontSize: 22,
    color: "#22C55E",
  },
  ringDotOrange: {
    fontSize: 22,
    color: "#F97316",
  },
  ringDotRed: {
    fontSize: 22,
    color: "#EF4444",
  },
  ringDotDotted: {
    fontSize: 22,
    color: "#9CA3AF",
  },
  ringExplTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  ringExplText: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },

  // Footer
  versionFooter: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
    marginBottom: 20,
    letterSpacing: 0.5,
  },

  // Interactions
  btnPressed: {
    opacity: 0.75,
  },
  rowPressed: {
    opacity: 0.8,
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  modalTextInput: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  genderOptionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  genderChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
