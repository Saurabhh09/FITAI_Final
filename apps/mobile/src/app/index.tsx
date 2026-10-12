import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../features/auth/auth-context";
import { AuthScreen } from "../features/auth/auth-screen";
import { DashboardScreen } from "../features/dashboard/dashboard-screen";
import { OnboardingScreen } from "../features/onboarding/onboarding-screen";
import { submitMobileOnboarding } from "../features/onboarding/onboarding-service";
import type { QuestionnaireAnswers } from "../features/onboarding/questionnaire";
import { WelcomeScreen } from "../features/welcome/welcome-screen";
import { getSupabase } from "../lib/supabase";

type UnauthenticatedRoute = "welcome" | "onboarding" | "signin" | "signup";

export default function MobileAppEntry() {
  const { loading, session, user, hasNutritionProfile, profileLoading, signOut, refreshProfile } = useAuth();
  const [cachedAnswers, setCachedAnswers] = useState<QuestionnaireAnswers | null>(null);
  const [unauthRoute, setUnauthRoute] = useState<UnauthenticatedRoute>("welcome");

  // 1. Initializing state
  if (loading || (session && profileLoading && hasNutritionProfile === null)) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.centeredScreen}>
          <View style={styles.brandMark} accessible accessibilityLabel="FITAI mark">
            <Text style={styles.brandLetter}>F</Text>
          </View>
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
          onComplete={(answers) => {
            setCachedAnswers(answers);
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

  // 3. Authenticated without nutrition profile -> Onboarding flow
  if (hasNutritionProfile === false) {
    return (
      <OnboardingScreen
        initialAnswers={cachedAnswers ?? undefined}
        onSignOut={async () => {
          setUnauthRoute("welcome");
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

          // RPC succeeded: refresh the profile check to transition to dashboard
          await refreshProfile();
        }}
      />
    );
  }

  // 4. Authenticated with nutrition profile -> Mobile Nutrition Dashboard!
  return <DashboardScreen />;
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
});
