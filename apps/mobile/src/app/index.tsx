import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../features/auth/auth-context";
import { AuthScreen } from "../features/auth/auth-screen";
import { MainTabShell } from "../features/navigation/main-tab-shell";
import { OnboardingScreen } from "../features/onboarding/onboarding-screen";
import { submitMobileOnboarding } from "../features/onboarding/onboarding-service";
import type { QuestionnaireAnswers } from "../features/onboarding/questionnaire";
import { WelcomeScreen } from "../features/welcome/welcome-screen";
import { getSupabase } from "../lib/supabase";

type UnauthenticatedRoute = "welcome" | "onboarding" | "signin" | "signup";
const PENDING_ONBOARDING_KEY = "@fitai_pending_onboarding_answers";

export default function MobileAppEntry() {
  const { loading, session, user, hasNutritionProfile, profileLoading, signOut, refreshProfile } = useAuth();
  const [cachedAnswers, setCachedAnswers] = useState<QuestionnaireAnswers | null>(null);
  const [unauthRoute, setUnauthRoute] = useState<UnauthenticatedRoute>("welcome");
  const submittingRef = useRef(false);
  const [isSubmittingOnboarding, setIsSubmittingOnboarding] = useState(false);
  const [onboardingSubmitError, setOnboardingSubmitError] = useState<string | null>(null);

  // Restore pending onboarding answers from persistent storage on mount
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(PENDING_ONBOARDING_KEY)
      .then((raw) => {
        if (!mounted || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            setCachedAnswers((prev) => prev ?? parsed);
          }
        } catch {
          // ignore parse errors
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  // When authenticated without nutrition profile, automatically submit cached answers
  useEffect(() => {
    if (!session || !user) return;
    if (hasNutritionProfile !== false) return;
    if (!cachedAnswers) return;
    if (submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmittingOnboarding(true);
    setOnboardingSubmitError(null);

    async function autoSubmit() {
      try {
        console.log("[MobileAppEntry] Starting auto-submit of onboarding answers for user:", user?.id);
        const client = getSupabase();

        // Wrap submit with 12s timeout to prevent hanging on network stalls
        const timeoutPromise = new Promise<{ ok: false; error: string }>((resolve) =>
          setTimeout(() => resolve({ ok: false, error: "Submission timed out. Please check your internet connection." }), 12000)
        );

        const submitPromise = submitMobileOnboarding(client, cachedAnswers!, {
          displayName: user?.user_metadata?.display_name ?? null,
        });

        const result = await Promise.race([submitPromise, timeoutPromise]);
        console.log("[MobileAppEntry] Onboarding submission result:", JSON.stringify(result));

        if (!result.ok) {
          submittingRef.current = false;
          setIsSubmittingOnboarding(false);
          setOnboardingSubmitError(result.error);
          return;
        }

        // Clean up pending storage and refresh profile to enter Dashboard
        await AsyncStorage.removeItem(PENDING_ONBOARDING_KEY).catch(() => {});
        setCachedAnswers(null);
        submittingRef.current = false;
        setIsSubmittingOnboarding(false);
        const hasProfile = await refreshProfile();
        console.log("[MobileAppEntry] Profile refreshed, hasProfile:", hasProfile);
      } catch (err) {
        console.error("[MobileAppEntry] Unexpected autoSubmit exception:", err);
        submittingRef.current = false;
        setIsSubmittingOnboarding(false);
        setOnboardingSubmitError(err instanceof Error ? err.message : "Failed to save profile.");
      }
    }

    autoSubmit();
  }, [session?.user?.id, hasNutritionProfile, cachedAnswers, refreshProfile]);

  // 1. Initializing state
  if (loading || (session && profileLoading && hasNutritionProfile === null)) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.centeredScreen}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.brandLogo}
            resizeMode="contain"
            accessible
            accessibilityLabel="FITAI mark"
          />
          <Text style={styles.brandName}>FITAI</Text>
          <ActivityIndicator size="small" color="#211F25" style={styles.loader} />
          <Text style={styles.loadingText}>Initializing session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Unauthenticated state -> Welcome screen / Onboarding / Auth
  if (!session || !user) {
    if (unauthRoute === "signin") {
      return (
        <AuthScreen
          initialMode="signin"
          onBack={() => setUnauthRoute("welcome")}
        />
      );
    }

    if (unauthRoute === "signup") {
      return (
        <AuthScreen
          initialMode="signup"
          onBack={() => setUnauthRoute(cachedAnswers ? "onboarding" : "welcome")}
        />
      );
    }

    if (unauthRoute === "onboarding") {
      return (
        <OnboardingScreen
          initialAnswers={cachedAnswers ?? undefined}
          onBackToWelcome={() => setUnauthRoute("welcome")}
          onComplete={async (answers) => {
            setCachedAnswers(answers);
            await AsyncStorage.setItem(PENDING_ONBOARDING_KEY, JSON.stringify(answers)).catch(() => {});
            setUnauthRoute("signup");
          }}
        />
      );
    }

    // Default opening screen for new and signed-out users
    return (
      <WelcomeScreen
        onGetStarted={() => setUnauthRoute("onboarding")}
        onSignIn={() => setUnauthRoute("signin")}
      />
    );
  }

  // 3. Authenticated without nutrition profile
  if (hasNutritionProfile === false) {
    // 3a. Auto-submitting cached onboarding answers
    if (cachedAnswers && !onboardingSubmitError) {
      return (
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <View style={styles.centeredScreen}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.brandLogo}
              resizeMode="contain"
              accessible
              accessibilityLabel="FITAI mark"
            />
            <Text style={styles.brandName}>FITAI</Text>
            <ActivityIndicator size="small" color="#211F25" style={styles.loader} />
            <Text style={styles.loadingText}>Personalizing your nutrition plan...</Text>
          </View>
        </SafeAreaView>
      );
    }

    // 3b. If auto-submission failed, show retry or review options
    if (onboardingSubmitError) {
      return (
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <View style={styles.centeredScreen}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.brandLogo}
              resizeMode="contain"
              accessible
              accessibilityLabel="FITAI mark"
            />
            <Text style={styles.errorTitle}>Could not save your plan</Text>
            <Text style={styles.errorMessage}>{onboardingSubmitError}</Text>
            <Pressable
              style={({ pressed }) => [styles.actionButton, pressed && styles.buttonPressed]}
              onPress={() => {
                submittingRef.current = false;
                setOnboardingSubmitError(null);
              }}
            >
              <Text style={styles.actionButtonText}>Try Again</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
              onPress={() => {
                submittingRef.current = false;
                setOnboardingSubmitError(null);
                setCachedAnswers(null);
                AsyncStorage.removeItem(PENDING_ONBOARDING_KEY).catch(() => {});
              }}
            >
              <Text style={styles.secondaryButtonText}>Review Onboarding Questions</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    // 3c. Fallback: Authenticated user without nutrition profile and no cached answers
    return (
      <OnboardingScreen
        initialAnswers={cachedAnswers ?? undefined}
        onSignOut={async () => {
          setUnauthRoute("welcome");
          await AsyncStorage.removeItem(PENDING_ONBOARDING_KEY).catch(() => {});
          setCachedAnswers(null);
          await signOut();
        }}
        onComplete={async (answers) => {
          setCachedAnswers(answers);
          const client = getSupabase();
          const result = await submitMobileOnboarding(client, answers, {
            displayName: user.user_metadata?.display_name ?? null,
          });

          if (!result.ok) {
            throw new Error(result.error);
          }

          await AsyncStorage.removeItem(PENDING_ONBOARDING_KEY).catch(() => {});
          setCachedAnswers(null);
          await refreshProfile();
        }}
      />
    );
  }

  // 4. Authenticated with nutrition profile -> Mobile Nutrition Dashboard + Tab Shell!
  return <MainTabShell />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F7FB",
  },
  centeredScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  brandLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  brandMark: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#211F25",
  },
  brandLetter: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -1.5,
  },
  brandName: {
    color: "#211F25",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  loader: {
    marginTop: 12,
  },
  loadingText: {
    color: "#77747C",
    fontSize: 14,
    fontWeight: "500",
  },
  errorTitle: {
    color: "#211F25",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
  errorMessage: {
    color: "#C53030",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: "#211F25",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    marginTop: 8,
    width: "100%",
    alignItems: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 4,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#77747C",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
